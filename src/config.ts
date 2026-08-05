import 'dotenv/config';
import { z } from 'zod';

const snowflake = z.string().regex(/^\d{17,20}$/, 'must be a Discord snowflake');

const environment = z.object({
  APPLICATION_ID: snowflake,
  APP_TOKEN: z.string().min(1),
  GUILD_IDS: z.string().min(1),
  USER_ID: z.string().optional(),
  ROLE_ID: z.string().optional()
});

const usingLegacyVariables = [
  'DISCORD_APPLICATION_ID',
  'DISCORD_TOKEN',
  'DISCORD_GUILD_IDS',
  'APP_EMOJI_MANAGER_USER_IDS',
  'APP_EMOJI_MANAGER_ROLE_IDS'
].some((name) => process.env[name] !== undefined);

const input = {
  APPLICATION_ID: process.env.APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID,
  APP_TOKEN: process.env.APP_TOKEN ?? process.env.DISCORD_TOKEN,
  GUILD_IDS: process.env.GUILD_IDS ?? process.env.DISCORD_GUILD_IDS,
  USER_ID: process.env.USER_ID ?? process.env.APP_EMOJI_MANAGER_USER_IDS,
  ROLE_ID: process.env.ROLE_ID ?? process.env.APP_EMOJI_MANAGER_ROLE_IDS
};

function idList(value: string | undefined, name: string): readonly string[] {
  if (!value?.trim()) return [];

  return value.split(',').map((id) => snowflake.parse(id.trim(), { path: [name] }));
}

const result = environment.safeParse(input);
if (!result.success) {
  const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(
    `Invalid Appmoji configuration. Set ${missing} in .env. Copy .env.example to .env and replace its example values.`
  );
}
if (usingLegacyVariables) {
  console.warn('Using legacy .env variable names. Rename them to the names in .env.example.');
}

const parsed = result.data;

export const config = {
  applicationId: parsed.APPLICATION_ID,
  token: parsed.APP_TOKEN,
  guildIds: idList(parsed.GUILD_IDS, 'GUILD_IDS'),
  managerUserIds: new Set(idList(parsed.USER_ID, 'USER_ID')),
  managerRoleIds: new Set(idList(parsed.ROLE_ID, 'ROLE_ID'))
} as const;
