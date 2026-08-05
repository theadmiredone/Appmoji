import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { config } from './config.js';
import { data as appemoji } from './commands/appemoji.js';

const rest = new REST({ version: '10' }).setToken(config.token);
const commands = [appemoji.toJSON()];

for (const guildId of config.guildIds) {
  await rest.put(Routes.applicationGuildCommands(config.applicationId, guildId), { body: commands });
  console.log(`Deployed ${commands.length} command(s) to guild ${guildId}.`);
}
