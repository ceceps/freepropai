import dotenv from 'dotenv';

dotenv.config();

export const llmConfig = {
  apiKey: process.env.AGENTROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
  baseURL: process.env.LLM_BASE_URL || process.env.AGENTROUTER_API_URL || 'https://agentrouter.org',
  model: (process.env.LLM_MODEL || 'claude-opus-4-8') as string,
  maxTokens: 4096,
  temperature: 0.7,
  imageModel: process.env.LLM_MODEL_IMAGE || 'ag/gemini-3.1-flash-image',
  imageBaseURL: process.env.LLM_BASE_URL_IMAGE || 'https://20128-27a8ef7bf11dfea7.monkeycode-ai.live/v1/images/generations',
  imageToken: process.env.LLM_TOKEN_IMAGE || '',
};

export const validateLLMConfig = () => {
  if (!llmConfig.apiKey) {
    if (process.env.ALLOW_MISSING_LLM === 'true') {
      console.warn('LLM API key is not set; AI generation features are disabled');
      return;
    }
    throw new Error('AGENTROUTER_API_KEY is not set in environment variables');
  }
  console.log('LLM configuration validated successfully');
  console.log(`Using LLM: ${llmConfig.model} via ${llmConfig.baseURL}`);
};
