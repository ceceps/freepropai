import Anthropic from '@anthropic-ai/sdk';
import { llmConfig } from '../config/llm';

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

class LLMClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.baseURL,
    });
  }

  async chat(messages: LLMMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    systemPrompt?: string;
  }): Promise<LLMResponse> {
    try {
      const response = await this.client.messages.create({
        model: options?.model || llmConfig.model,
        max_tokens: options?.maxTokens || llmConfig.maxTokens,
        temperature: options?.temperature ?? llmConfig.temperature,
        system: options?.systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const textContent = response.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      return {
        content: textContent.text,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error('Claude API Error:', error);
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Claude API Error: ${error.message}`);
      }
      throw error;
    }
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<string> {
    const messages: LLMMessage[] = [
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chat(messages, {
      ...options,
      systemPrompt,
    });
    return response.content;
  }

  async generateJSON<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<T> {
    const content = await this.generateCompletion(systemPrompt, userPrompt, options);
    
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonString.trim());
    } catch (error) {
      console.error('Failed to parse JSON from Claude response:', content);
      throw new Error('Claude response is not valid JSON');
    }
  }
}

// Singleton instance
export const llmClient = new LLMClient();

export default llmClient;
