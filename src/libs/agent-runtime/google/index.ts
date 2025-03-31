import type { VertexAI } from '@google-cloud/vertexai';
import {
  Content,
  FunctionCallPart,
  FunctionDeclaration,
  Tool as GoogleFunctionCallTool,
  GoogleGenerativeAI,
  GoogleSearchRetrievalTool,
  Part,
  SchemaType,
} from '@google/generative-ai';

import type { ChatModelCard } from '@/types/llm';
import { imageUrlToBase64 } from '@/utils/imageToBase64';
import { safeParseJSON } from '@/utils/safeParseJSON';

import { LobeRuntimeAI } from '../BaseAI';
import { AgentRuntimeErrorType, ILobeAgentRuntimeErrorType } from '../error';
import {
  ChatCompetitionOptions,
  ChatCompletionTool,
  ChatStreamPayload,
  Embeddings,
  EmbeddingsOptions,
  EmbeddingsPayload,
  OpenAIChatMessage,
  UserMessageContentPart,
} from '../types';
import { AgentRuntimeError } from '../utils/createError';
import { debugStream } from '../utils/debugStream';
import { StreamingResponse } from '../utils/response';
import {
  GoogleGenerativeAIStream,
  VertexAIStream,
  convertIterableToStream,
} from '../utils/streams';
import { parseDataUri } from '../utils/uriParser';

const modelsOffSafetySettings = new Set(['gemini-2.0-flash-exp']);

const modelsWithModalities = new Set([
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-exp-image-generation',
]);

const modelsDisableInstuction = new Set([
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-exp-image-generation',
]);

export interface GoogleModelCard {
  displayName: string;
  inputTokenLimit: number;
  name: string;
  outputTokenLimit: number;
}

enum HarmCategory {
  HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT',
  HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
}

enum HarmBlockThreshold {
  BLOCK_NONE = 'BLOCK_NONE',
}

function getThreshold(model: string): HarmBlockThreshold {
  if (modelsOffSafetySettings.has(model)) {
    return 'OFF' as HarmBlockThreshold; // https://discuss.ai.google.dev/t/59352
  }
  return HarmBlockThreshold.BLOCK_NONE;
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

interface LobeGoogleAIParams {
  apiKey?: string;
  baseURL?: string;
  client?: GoogleGenerativeAI | VertexAI;
  id?: string;
  isVertexAi?: boolean;
}

export class LobeGoogleAI implements LobeRuntimeAI {
  private client: GoogleGenerativeAI;
  private isVertexAi: boolean;
  baseURL?: string;
  apiKey?: string;
  provider: string;

  constructor({ apiKey, baseURL, client, isVertexAi, id }: LobeGoogleAIParams = {}) {
    if (!apiKey) throw AgentRuntimeError.createError(AgentRuntimeErrorType.InvalidProviderAPIKey);

    this.client = new GoogleGenerativeAI(apiKey);
    this.apiKey = apiKey;
    this.client = client ? (client as GoogleGenerativeAI) : new GoogleGenerativeAI(apiKey);
    this.baseURL = client ? undefined : baseURL || DEFAULT_BASE_URL;
    this.isVertexAi = isVertexAi || false;

    this.provider = id || (isVertexAi ? 'vertexai' : 'google');
  }

  async chat(rawPayload: ChatStreamPayload, options?: ChatCompetitionOptions) {
    try {
      const payload = this.buildPayload(rawPayload);
      const model = payload.model;

      const contents = await this.buildGoogleMessages(payload.messages);

      const geminiStreamResult = await this.client
        .getGenerativeModel(
          {
            generationConfig: {
              maxOutputTokens: payload.max_tokens,
              // @ts-expect-error - Google SDK 0.24.0 doesn't have this property for now with
              response_modalities: modelsWithModalities.has(model) ? ['Text', 'Image'] : undefined,
              temperature: payload.temperature,
              topP: payload.top_p,
            },
            model,
            // avoid wide sensitive words
            // refs: https://github.com/lobehub/lobe-chat/pull/1418
            safetySettings: [
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: getThreshold(model),
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: getThreshold(model),
              },
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: getThreshold(model),
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: getThreshold(model),
              },
            ],
          },
          { apiVersion: 'v1alpha', baseUrl: this.baseURL },
        )
        .generateContentStream({
          contents,
          systemInstruction: modelsDisableInstuction.has(model)
            ? undefined
            : (payload.system as string),
          tools: this.buildGoogleTools(payload.tools, payload),
        });

      const googleStream = convertIterableToStream(geminiStreamResult.stream);
      const [prod, useForDebug] = googleStream.tee();

      const key = this.isVertexAi
        ? 'DEBUG_VERTEX_AI_CHAT_COMPLETION'
        : 'DEBUG_GOOGLE_CHAT_COMPLETION';

      if (process.env[key] === '1') {
        debugStream(useForDebug).catch();
      }

      // Convert the response into a friendly text-stream
      const Stream = this.isVertexAi ? VertexAIStream : GoogleGenerativeAIStream;
      const stream = Stream(prod, options?.callback);

      // Respond with the stream
      return StreamingResponse(stream, { headers: options?.headers });
    } catch (e) {
      const err = e as Error;

      console.log(err);
      const { errorType, error } = this.parseErrorMessage(err.message);

      throw AgentRuntimeError.chat({ error, errorType, provider: this.provider });
    }
  }

  async models() {
    const { LOBE_DEFAULT_MODEL_LIST } = await import('@/config/aiModels');

    const url = `${this.baseURL}/v1alpha/models?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'GET',
    });
    const json = await response.json();

    const modelList: GoogleModelCard[] = json['models'];

    return modelList
      .map((model) => {
        const modelName = model.name.replace(/^models\//, '');

        const knownModel = LOBE_DEFAULT_MODEL_LIST.find(
          (m) => modelName.toLowerCase() === m.id.toLowerCase(),
        );

        return {
          contextWindowTokens: model.inputTokenLimit + model.outputTokenLimit,
          displayName: model.displayName,
          enabled: knownModel?.enabled || false,
          functionCall:
            (modelName.toLowerCase().includes('gemini') &&
              !modelName.toLowerCase().includes('thinking')) ||
            knownModel?.abilities?.functionCall ||
            false,
          id: modelName,
          reasoning:
            modelName.toLowerCase().includes('thinking') ||
            knownModel?.abilities?.reasoning ||
            false,
          vision:
            modelName.toLowerCase().includes('vision') ||
            (modelName.toLowerCase().includes('gemini') &&
              !modelName.toLowerCase().includes('gemini-1.0')) ||
            knownModel?.abilities?.vision ||
            false,
        };
      })
      .filter(Boolean) as ChatModelCard[];
  }

  async embeddings(payload: EmbeddingsPayload, options?: EmbeddingsOptions): Promise<Embeddings[]> {
    try {
      const input = Array.isArray(payload.input) ? payload.input : [payload.input];

      // Clean up model name - remove google/ prefix if present
      const modelName = payload.model.includes('/') ? payload.model.split('/')[1] : payload.model;

      // Use the full dimensions for Gemini embedding model (3072)
      // Don't specify dimensions for other models to use their defaults
      const useNativeDimensions = modelName === 'gemini-embedding-exp-03-07';

      console.log(
        `Attempting Google embeddings with model: ${modelName}${useNativeDimensions ? ' (using native 3072 dimensions)' : ''}`,
      );

      // Import OpenAI client dynamically to avoid bundling issues
      const { OpenAI } = await import('openai');

      // Create OpenAI client with Google's compatibility layer
      const openai = new OpenAI({
        apiKey: this.apiKey,
        baseURL: `${this.baseURL || DEFAULT_BASE_URL}/v1beta/openai`,
      });

      console.log(`Using OpenAI compatibility layer for embeddings`);

      // Use the OpenAI client's embeddings.create method directly
      // For Gemini, don't specify dimensions to get full 3072-dimensional vectors
      const embeddingParams: any = {
        encoding_format: 'float',
        input,
        model: modelName,
      };

      // No dimensions parameter - let the model use its native dimensions

      const embedding = await openai.embeddings.create(embeddingParams, {
        signal: options?.signal,
      });

      // Extract just the embeddings from the response
      const vectors = embedding.data.map((item) => item.embedding);

      // Debug log the actual dimension of the first vector
      if (vectors.length > 0) {
        console.log(`Received embeddings with actual dimension: ${vectors[0].length}`);
      }

      console.log(`Successfully prepared embeddings for database storage`);

      return vectors;
    } catch (e) {
      const err = e as Error;
      console.error('Google AI embedding error:', err);

      // Add more detailed error logging
      if (err.message.includes('RESOURCE_EXHAUSTED')) {
        console.error('Rate limit exceeded. Check your quota or try again later.');
      } else if (err.message.includes('API_KEY_INVALID')) {
        console.error('The API key appears to be invalid or has incorrect permissions.');
      } else if (err.message.includes('PERMISSION_DENIED')) {
        console.error('Permission denied. Verify your API key has access to embedding models.');
      } else if (err.message.includes('INVALID_ARGUMENT')) {
        console.error('Invalid argument in request. Check model name and input format.');
      } else if (err.message.includes('dimensions')) {
        console.error(
          'Dimensions parameter issue. Verify the model supports the requested dimensions.',
        );
      } else if (err.message.includes('CheckExpectedDim')) {
        console.error(
          'PGVector dimension mismatch error. The database expects a different vector dimension.',
        );
      }

      const { errorType, error } = this.parseErrorMessage(err.message);

      throw AgentRuntimeError.chat({ error, errorType, provider: this.provider });
    }
  }

  private buildPayload(payload: ChatStreamPayload) {
    const system_message = payload.messages.find((m) => m.role === 'system');
    const user_messages = payload.messages.filter((m) => m.role !== 'system');

    return {
      ...payload,
      messages: user_messages,
      system: system_message?.content,
    };
  }
  private convertContentToGooglePart = async (
    content: UserMessageContentPart,
  ): Promise<Part | undefined> => {
    switch (content.type) {
      default: {
        return undefined;
      }

      case 'text': {
        return { text: content.text };
      }

      case 'image_url': {
        const { mimeType, base64, type } = parseDataUri(content.image_url.url);

        if (type === 'base64') {
          if (!base64) {
            throw new TypeError("Image URL doesn't contain base64 data");
          }

          return {
            inlineData: {
              data: base64,
              mimeType: mimeType || 'image/png',
            },
          };
        }

        if (type === 'url') {
          const { base64, mimeType } = await imageUrlToBase64(content.image_url.url);

          return {
            inlineData: {
              data: base64,
              mimeType,
            },
          };
        }

        throw new TypeError(`currently we don't support image url: ${content.image_url.url}`);
      }
    }
  };

  private convertOAIMessagesToGoogleMessage = async (
    message: OpenAIChatMessage,
  ): Promise<Content> => {
    const content = message.content as string | UserMessageContentPart[];
    if (!!message.tool_calls) {
      return {
        parts: message.tool_calls.map<FunctionCallPart>((tool) => ({
          functionCall: {
            args: safeParseJSON(tool.function.arguments)!,
            name: tool.function.name,
          },
        })),
        role: 'function',
      };
    }

    const getParts = async () => {
      if (typeof content === 'string') return [{ text: content }];

      const parts = await Promise.all(
        content.map(async (c) => await this.convertContentToGooglePart(c)),
      );
      return parts.filter(Boolean) as Part[];
    };

    return {
      parts: await getParts(),
      role: message.role === 'assistant' ? 'model' : 'user',
    };
  };

  // convert messages from the OpenAI format to Google GenAI SDK
  private buildGoogleMessages = async (messages: OpenAIChatMessage[]): Promise<Content[]> => {
    const pools = messages
      .filter((message) => message.role !== 'function')
      .map(async (msg) => await this.convertOAIMessagesToGoogleMessage(msg));

    return Promise.all(pools);
  };

  private parseErrorMessage(message: string): {
    error: any;
    errorType: ILobeAgentRuntimeErrorType;
  } {
    const defaultError = {
      error: { message },
      errorType: AgentRuntimeErrorType.ProviderBizError,
    };

    if (message.includes('location is not supported'))
      return { error: { message }, errorType: AgentRuntimeErrorType.LocationNotSupportError };

    const startIndex = message.lastIndexOf('[');
    if (startIndex === -1) {
      return defaultError;
    }

    try {
      // 从开始位置截取字符串到最后
      const jsonString = message.slice(startIndex);

      // 尝试解析 JSON 字符串
      const json: GoogleChatErrors = JSON.parse(jsonString);

      const bizError = json[0];

      switch (bizError.reason) {
        case 'API_KEY_INVALID': {
          return { ...defaultError, errorType: AgentRuntimeErrorType.InvalidProviderAPIKey };
        }

        default: {
          return { error: json, errorType: AgentRuntimeErrorType.ProviderBizError };
        }
      }
    } catch {
      //
    }

    const errorObj = this.extractErrorObjectFromError(message);

    const { errorDetails } = errorObj;

    if (errorDetails) {
      return { error: errorDetails, errorType: AgentRuntimeErrorType.ProviderBizError };
    }

    return defaultError;
  }

  private buildGoogleTools(
    tools: ChatCompletionTool[] | undefined,
    payload?: ChatStreamPayload,
  ): GoogleFunctionCallTool[] | undefined {
    // 目前 Tools (例如 googleSearch) 无法与其他 FunctionCall 同时使用
    if (payload?.enabledSearch) {
      return [{ googleSearch: {} } as GoogleSearchRetrievalTool];
    }

    if (!tools || tools.length === 0) return;

    return [
      {
        functionDeclarations: tools.map((tool) => this.convertToolToGoogleTool(tool)),
      },
    ];
  }

  private convertToolToGoogleTool = (tool: ChatCompletionTool): FunctionDeclaration => {
    const functionDeclaration = tool.function;
    const parameters = functionDeclaration.parameters;
    // refs: https://github.com/lobehub/lobe-chat/pull/5002
    const properties =
      parameters?.properties && Object.keys(parameters.properties).length > 0
        ? parameters.properties
        : { dummy: { type: 'string' } }; // dummy property to avoid empty object

    return {
      description: functionDeclaration.description,
      name: functionDeclaration.name,
      parameters: {
        description: parameters?.description,
        properties: properties,
        required: parameters?.required,
        type: SchemaType.OBJECT,
      },
    };
  };

  private extractErrorObjectFromError(message: string) {
    // 使用正则表达式匹配状态码部分 [数字 描述文本]
    const regex = /^(.*?)(\[\d+ [^\]]+])(.*)$/;
    const match = message.match(regex);

    if (match) {
      const prefix = match[1].trim();
      const statusCodeWithBrackets = match[2].trim();
      const message = match[3].trim();

      // 提取状态码数字
      const statusCodeMatch = statusCodeWithBrackets.match(/\[(\d+)/);
      const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1]) : null;

      // 创建包含状态码和消息的JSON
      const resultJson = {
        message: message,
        statusCode: statusCode,
        statusCodeText: statusCodeWithBrackets,
      };

      return {
        errorDetails: resultJson,
        prefix: prefix,
      };
    }

    // 如果无法匹配，返回原始消息
    return {
      errorDetails: null,
      prefix: message,
    };
  }
}

export default LobeGoogleAI;

type GoogleChatErrors = GoogleChatError[];

interface GoogleChatError {
  '@type': string;
  'domain': string;
  'metadata': {
    service: string;
  };
  'reason': string;
}
