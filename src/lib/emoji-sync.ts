import type { Client } from 'discord.js';
import { config } from '../config.js';
import { ApplicationEmojiClient } from './application-emoji-client.js';
import { emojiSourceToDataUri } from './image.js';

const APPLICATION_EMOJI_LIMIT = 2_000;

export async function syncGuildEmojis(
  client: Client,
  applicationEmojis: ApplicationEmojiClient
): Promise<void> {
  if (config.emojiSyncGuildIds.length === 0) return;

  const applicationEmojiList = await applicationEmojis.list();
  const existing = new Set(
    applicationEmojiList
      .map((emoji) => emoji.name?.toLowerCase())
      .filter((name): name is string => Boolean(name))
  );
  let count = applicationEmojiList.length;

  for (const guildId of config.emojiSyncGuildIds) {
    try {
      const guild = await client.guilds.fetch(guildId);
      const sourceEmojis = await guild.emojis.fetch();
      let added = 0;
      for (const source of sourceEmojis.values()) {
        if (!source.name || existing.has(source.name.toLowerCase())) continue;
        if (count >= APPLICATION_EMOJI_LIMIT) {
          console.warn('Application emoji limit reached; stopping startup emoji sync.');
          return;
        }
        try {
          await applicationEmojis.create(
            source.name,
            await emojiSourceToDataUri(source.imageURL())
          );
          existing.add(source.name.toLowerCase());
          count += 1;
          added += 1;
        } catch (error) {
          console.warn(`Could not sync :${source.name}: from guild ${guildId}.`, error);
        }
      }
      console.log(`Emoji sync: added ${added} emoji(s) from ${guild.name}.`);
    } catch (error) {
      console.warn(`Could not sync emojis from guild ${guildId}.`, error);
    }
  }
}
