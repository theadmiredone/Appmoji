import 'dotenv/config';
import { z } from 'zod';

const snowflake = z.string().regex(/^\d{17,20}$/, 'must be a Discord snowflake');

const environment = z.object({
  DISCORD_APPLICATION_ID: snowflake,
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_GUILD_IDS: z.string().min(1),
  APP_EMOJI_MANAGER_USER_IDS: z.string().optional(),
  APP_EMOJI_MANAGER_ROLE_IDS: z.string().optional()
});

function idList(value: string | undefined, name: string): readonly string[] {
  if (!value?.trim()) return [];

  return value.split(',').map((id) => snowflake.parse(id.trim(), { path: [name] }));
}

const parsed = environment.parse(process.env);

export const config = {
  applicationId: parsed.DISCORD_APPLICATION_ID,
  token: parsed.DISCORD_TOKEN,
  guildIds: idList(parsed.DISCORD_GUILD_IDS, 'DISCORD_GUILD_IDS'),
  managerUserIds: new Set(idList(parsed.APP_EMOJI_MANAGER_USER_IDS, 'APP_EMOJI_MANAGER_USER_IDS')),
  managerRoleIds: new Set(idList(parsed.APP_EMOJI_MANAGER_ROLE_IDS, 'APP_EMOJI_MANAGER_ROLE_IDS'))
} as const;
