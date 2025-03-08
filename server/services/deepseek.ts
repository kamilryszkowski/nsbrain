import axios from 'axios';
import { config } from '../config';

interface DeepseekResponse {
  text: string;
}

export class DeepseekService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.apiUrl = config.deepseek.apiUrl;
    this.apiKey = config.deepseek.apiKey;
  }

  async generateResponse(systemPrompt: string, wikiContext: string, userQuery: string): Promise<string> {
    try {
      const response = await axios.post<DeepseekResponse>(
        `${this.apiUrl}/completions`,
        {
          prompt: `${systemPrompt}\n\nContext from wiki:\n${wikiContext}\n\nUser question: ${userQuery}`,
          max_tokens: config.deepseek.maxTokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: config.responseTimeout,
        }
      );

      return response.data.text;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Deepseek API error: ${error.response.status} - ${error.response.data}`);
        } else if (error.request) {
          throw new Error('No response received from Deepseek API');
        }
      }
      throw error;
    }
  }
}

export const deepseekService = new DeepseekService();
