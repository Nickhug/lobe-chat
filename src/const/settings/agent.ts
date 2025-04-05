import { DEFAULT_AGENT_META } from '@/const/meta';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '@/const/settings/llm';
import { LobeAgentChatConfig, LobeAgentConfig, LobeAgentTTSConfig } from '@/types/agent';
import { UserDefaultAgent } from '@/types/user/settings';
import fs from 'node:fs';
import path from 'node:path';

export const DEFAUTT_AGENT_TTS_CONFIG: LobeAgentTTSConfig = {
  showAllLocaleVoice: false,
  sttLocale: 'auto',
  ttsService: 'openai',
  voice: {
    openai: 'alloy',
  },
};

export const DEFAULT_AGENT_SEARCH_FC_MODEL = {
  model: DEFAULT_MODEL,
  provider: DEFAULT_PROVIDER,
};

export const DEFAULT_AGENT_CHAT_CONFIG: LobeAgentChatConfig = {
  autoCreateTopicThreshold: 2,
  displayMode: 'chat',
  enableAutoCreateTopic: true,
  enableCompressHistory: true,
  enableHistoryCount: true,
  enableReasoning: false,
  historyCount: 8,
  reasoningBudgetToken: 1024,
  searchFCModel: DEFAULT_AGENT_SEARCH_FC_MODEL,
  searchMode: 'off',
};

// Try to load system role from file, fallback to hardcoded value if it fails
let PROPERT_SYSTEM_ROLE = '';
try {
  const systemRolePath = path.join(process.cwd(), 'system_role.txt');
  if (fs.existsSync(systemRolePath)) {
    PROPERT_SYSTEM_ROLE = fs.readFileSync(systemRolePath, 'utf-8');
  }
} catch (error) {
  console.error('Error loading system role from file:', error);
}

// Hardcode the system role as fallback for redundancy
if (!PROPERT_SYSTEM_ROLE) {
  PROPERT_SYSTEM_ROLE = `## You are Propert, a specialized real estate AI assistant dedicated to finding, analyzing, and reporting on property listings. Your primary function is to use available tools to gather property data and transform it into valuable insights for users.
You are professional, accurate, and never mention or disclose the internal names of data providers like "Datafiniti" or "Tavily" to the user.

## Model Policy: Source Citation & Accuracy
- You MUST DISCLOSE the primary sources (e.g., Property Database Search, Web Search Result) used in your report/response.
- NEVER generate hallucinated information. All factual statements require a verifiable source reference.
- Use \`[source]\` notation for key factual statements, statistics, direct quotes, and data points derived from tool lookups.
- Verify information across multiple sources when possible.
- Maintain source traceability. Your search path may be reviewed.
- Include a distinct "Sources" section at the end of each response detailing tool utilization.`;
}

export const DEFAULT_AGENT_CONFIG: LobeAgentConfig = {
  chatConfig: DEFAULT_AGENT_CHAT_CONFIG,
  model: DEFAULT_MODEL,
  params: {
    frequency_penalty: 0,
    presence_penalty: 0,
    temperature: 1,
    top_p: 1,
  },
  plugins: [],
  provider: DEFAULT_PROVIDER,
  systemRole: PROPERT_SYSTEM_ROLE,
  tts: DEFAUTT_AGENT_TTS_CONFIG,
};

export const DEFAULT_AGENT: UserDefaultAgent = {
  config: DEFAULT_AGENT_CONFIG,
  meta: DEFAULT_AGENT_META,
};
