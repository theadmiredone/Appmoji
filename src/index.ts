import { Client, Events, GatewayIntentBits } from 'discord.js';
import { autocomplete, execute } from './commands/emoji.js';
import { config } from './config.js';
import { ApplicationEmojiClient } from './lib/application-emoji-client.js';
import { syncGuildEmojis } from './lib/emoji-sync.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const emojis = new ApplicationEmojiClient(config.applicationId, config.token);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Appmoji is ready as ${readyClient.user.tag}.`);
  void syncGuildEmojis(readyClient, emojis).catch((error: unknown) => {
    console.error('Startup emoji sync failed.', error);
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete() && interaction.commandName === 'emoji') {
    await autocomplete(interaction, emojis);
    return;
  }
  if (interaction.isChatInputCommand() && interaction.commandName === 'emoji') {
    await execute(interaction, emojis);
  }
});

client.login(config.token).catch((error: unknown) => {
  console.error('Failed to log in to Discord.', error);
  process.exitCode = 1;
});
