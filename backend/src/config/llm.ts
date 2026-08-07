import dotenv from 'dotenv';

dotenv.config();

export const llmConfig = {
  apiKey: process.env.AGENTROUTER_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || '',
  baseURL: process.env.AGENTROUTER_API_URL || 'https://agentrouter.org',
  model: (process.env.LLM_MODEL || 'claude-opus-4-8') as string,
  maxTokens: 4096,
  temperature: 0.7,
};

export const validateLLMConfig = () => {
  if (!llmConfig.apiKey) {
    throw new Error('AGENTROUTER_API_KEY is not set in environment variables');
  }
  console.log('LLM configuration validated successfully');
  console.log(`Using LLM: ${llmConfig.model} via ${llmConfig.baseURL}`);
};
