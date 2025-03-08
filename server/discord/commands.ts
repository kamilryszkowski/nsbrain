import { ChatInputCommandInteraction, Message, EmbedBuilder } from 'discord.js';
import { storage } from '../storage';
import { deepseekService } from '../services/deepseek';
import { config } from '../config';

const SYSTEM_PROMPT = `You are a helpful assistant for the Network School (NS) community. 
Your goal is to provide accurate and concise answers based on the provided wiki context.
Always cite specific details from the wiki when available.`;

export async function handleAskCommand(interaction: ChatInputCommandInteraction) {
  const query = interaction.options.getString('question', true);
  await handleQuery(interaction, query);
}

export async function handleDirectMessage(message: Message) {
  if (message.author.bot) return;
  await handleQuery(message, message.content);
}

async function handleQuery(source: ChatInputCommandInteraction | Message, query: string) {
  const startTime = Date.now();
  
  try {
    const contexts = await storage.getAllWikiContexts();
    if (contexts.length === 0) {
      throw new Error('No wiki context available');
    }

    // Combine all relevant wiki contexts
    const wikiContext = contexts.map(ctx => `${ctx.topic}:\n${ctx.content}`).join('\n\n');

    // Generate response using Deepseek
    const response = await deepseekService.generateResponse(SYSTEM_PROMPT, wikiContext, query);
    const responseTime = Date.now() - startTime;

    // Save the query
    await storage.saveQuery({
      userId: source instanceof Message ? source.author.id : source.user.id,
      query,
      response,
      responseTime,
    });

    // Create embed response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Network School Assistant')
      .setDescription(response)
      .setFooter({ text: `Response time: ${responseTime}ms` });

    if (source instanceof Message) {
      await source.reply({ embeds: [embed] });
    } else {
      await source.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Error')
      .setDescription(`Failed to process your query: ${errorMessage}\n\nPlease check the Notion wiki directly or contact an administrator.`);

    if (source instanceof Message) {
      await source.reply({ embeds: [errorEmbed] });
    } else {
      await source.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}
