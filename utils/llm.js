import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { transformSchemaForGoogle, parseMessagesForGoogle } from './llmUtils.js'

export const models = {
  'GPT-4o': 'gpt-4o',
  'GPT-4o-mini': 'gpt-4o-mini',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  embedding: 'text-embedding-3-small',
}

const getProvider = (model) => {
  if (model === models['gemini-2.0-flash']) return 'GOOGLE'
  return 'OPENAI'
}

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
const getGoogleGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Main function for accessing AI models across different providers.
 * 
 * @param {Object} options - The options for the LLM call
 * @param {string} options.model - The model to use (from the models object)
 * @param {Array} options.messages - Messages in OpenAI format (array of {role, content} objects)
 * @param {Object} [options.response_format] - Optional response format specification
 * 
 * @returns {Object} - Contains the generated message and token usage statistics
 * 
 * NOTE: All inputs should be provided in OpenAI format, regardless of the underlying
 * provider. For Google models, the function will automatically transform the input
 * to the appropriate format.
 */
export const callLLM = async ({ model, messages, response_format }) => {
  const provider = getProvider(model)

  let message,
    usage

  if (provider === 'GOOGLE') {
    const { systemInstruction, history, lastUserMessage } = parseMessagesForGoogle(messages)

    let generationConfig

    // Transform OpenAI JSON schema format to Google format if provided
    if (response_format?.type === 'json_schema') {
      generationConfig = {
        responseMimeType: 'application/json',
        responseSchema: transformSchemaForGoogle(response_format.json_schema),
      }
    }

    const chat = getGoogleGenAI()
      .getGenerativeModel({
        model,
        systemInstruction,
        generationConfig,
      })
      .startChat({ history })

    const result = await chat.sendMessage(lastUserMessage)

    message = result.response.text()

    usage = {
      prompt_tokens: result.response.usageMetadata.promptTokenCount,
      completion_tokens: result.response.usageMetadata.candidatesTokenCount,
      total_tokens: result.response.usageMetadata.totalTokenCount,
    }

  } else {
    const resp = await getOpenAI().chat.completions.create({
      model,
      messages,
      response_format,
    })

    message = resp.choices[0].message.content
    usage = resp.usage
  }

  return { message, usage }
}

export const createEmbedding = async ({ text = '' }) => {
  const CHARACTER_LIMIT_FOR_EMBEDDINGS = 20000 // max tokens is 8191

  try {
    const response = await getOpenAI().embeddings.create({
      model: models.embedding,
      input: text.slice(-CHARACTER_LIMIT_FOR_EMBEDDINGS),
      dimensions: 512,
    })

    return response.data[0].embedding
  } catch (error) {
    console.error(error)
    return null
  }
}
