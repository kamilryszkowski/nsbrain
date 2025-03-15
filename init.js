// init.js
// Initializes and sets up the Discord bot

import { Client, Events, GatewayIntentBits, ChannelType } from 'discord.js';

// Initialize the Discord bot
const initializeBot = (messageHandler) => {
  // Create Discord client with all required intents
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Needed to read message content
      GatewayIntentBits.DirectMessages, // Needed for DMs
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
    ],
  });

  // Track recently processed messages to prevent duplicates
  const processedMessages = new Set();
  const MESSAGE_EXPIRY = 30000; // Remove message IDs after 30 seconds

  // Helper to track processed messages
  const trackMessage = (messageId) => {
    if (processedMessages.has(messageId)) {
      return false; // Already processed
    }
    processedMessages.add(messageId);
    setTimeout(() => {
      processedMessages.delete(messageId);
    }, MESSAGE_EXPIRY);
    return true; // New message
  };

  // Handle bot ready event
  const handleReady = async () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);
    console.log('Bot is ready to respond to mentions and DMs!');
  };

  // Initialize the bot
  const initialize = async () => {
    console.log('Setting up Discord bot...');

    // Set up event handlers
    client.on(Events.ClientReady, handleReady);
    
    // Handle message events
    client.on(Events.MessageCreate, (message) => {
      // Ignore messages from bots (including itself)
      if (message.author.bot) return;
      
      // Check if message was already processed
      if (!trackMessage(message.id)) return;
      
      // Check if the message is a DM
      const isDM = message.channel.type === ChannelType.DM || 
                   message.channel.type === 'DM' || 
                   message.channel.type === 1 || 
                   !message.guild;
      
      if (isDM) {
        // Handle as a direct message
        messageHandler.handleDirectMessage(message).catch(error => {
          console.error('Error in handleDirectMessage:', error);
        });
      } else {
        // Handle as a potential mention in a guild channel
        messageHandler.handleMention(message, client.user.id).catch(error => {
          console.error('Error in handleMention:', error);
        });
      }
    });
    
    // Listen for raw gateway events to catch DMs that might be missed
    client.on('raw', packet => {
      // Only process direct messages from the raw packet
      if (packet.t === 'MESSAGE_CREATE' && packet.d && !packet.d.guild_id && !packet.d.author.bot) {
        // Check if message was already processed
        if (!trackMessage(packet.d.id)) return;
        
        // Try to get the channel and user from the client cache
        try {
          const channelId = packet.d.channel_id;
          const userId = packet.d.author.id;
          
          // Get the channel from cache or fetch it
          client.channels.fetch(channelId).then(channel => {
            if (channel) {
              // Create a simple message-like object for the handler
              const simpleMessage = {
                id: packet.d.id, // Add message ID for tracking
                content: packet.d.content,
                author: {
                  id: userId,
                  tag: `${packet.d.author.username}#${packet.d.author.discriminator}`,
                  bot: packet.d.author.bot,
                  createDM: async () => channel
                },
                channel: channel,
                reply: async (content) => channel.send(content)
              };
              
              // Process the message
              messageHandler.handleDirectMessage(simpleMessage).catch(error => {
                console.error('Error handling raw DM packet:', error);
              });
            }
          }).catch(error => {
            console.error('Error fetching channel from raw packet:', error);
          });
        } catch (error) {
          console.error('Error processing raw DM packet:', error);
        }
      }
    });
    
    // Listen for error events
    client.on('error', error => {
      console.error('CLIENT ERROR:', error);
    });
    
    // Listen for warn events
    client.on('warn', warning => {
      console.warn('CLIENT WARNING:', warning);
    });

    // Start the bot
    try {
      await client.login(process.env.DISCORD_TOKEN);
      console.log('Successfully logged in to Discord');
    } catch (error) {
      console.error('Failed to login to Discord:', error);
      throw error;
    }
  };

  return {
    initialize
  };
};

export default initializeBot; 