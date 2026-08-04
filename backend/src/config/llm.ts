import dotenv from 'dotenv';

dotenv.config();

export const llmConfig = {
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || '',
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://agentrouter.org',
  model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
  maxTokens: 4096,
  temperature: 0.7,
};

export const validateLLMConfig = () => {
  if (!llmConfig.apiKey) {
    throw new Error('ANTHROPIC_AUTH_TOKEN is not set in environment variables');
  }
  console.log('LLM configuration validated successfully');
};
