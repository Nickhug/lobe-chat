// This file contains documentation on how to use Google embeddings
// with LobeChat. The actual implementation is in ../index.ts

/**
 * Google AI Embeddings Implementation
 *
 * This implementation adds support for Google AI embedding models
 * like gemini-embedding-exp-03-07 to LobeChat.
 *
 * Usage example:
 *
 * 1. Set your Google API key:
 *    GOOGLE_API_KEY=your_google_api_key
 *
 * 2. Configure the embedding model:
 *    DEFAULT_FILES_CONFIG="embedding_model=google/gemini-embedding-exp-03-07,reranker_model=cohere/rerank-english-v3.0,query_mode=full_text"
 *
 * The implementation calls the Google AI API endpoint:
 * https://generativelanguage.googleapis.com/v1beta/models/MODEL_NAME:embedContent?key=API_KEY
 *
 * with a payload structure:
 * {
 *   content: { parts: [{ text: "Your text to embed" }] },
 *   taskType: "RETRIEVAL_DOCUMENT",
 *   title: "Embedding request"
 * }
 *
 * The response format from Google AI contains:
 * {
 *   embedding: {
 *     values: [0.1, 0.2, 0.3, ...] // vector of floating point numbers
 *   }
 * }
 *
 * If you encounter issues:
 * 1. Check your Google API key has access to Gemini embedding models
 * 2. Verify the model name exists (gemini-embedding-exp-03-07)
 * 3. Ensure your network can reach the Google AI API endpoints
 */

// No actual test code as it would require mocking fetch
