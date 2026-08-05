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

function idList(value: string | undefined, name: string): readonly string[] {
  if (!value?.trim()) return [];

  return value.split(',').map((id) => snowflake.parse(id.trim(), { path: [name] }));
}

const parsed = environment.parse(process.env);

export const config = {
  applicationId: parsed.APPLICATION_ID,
  token: parsed.APP_TOKEN,
  guildIds: idList(parsed.GUILD_IDS, 'GUILD_IDS'),
  managerUserIds: new Set(idList(parsed.USER_ID, 'USER_ID')),
  managerRoleIds: new Set(idList(parsed.ROLE_ID, 'ROLE_ID'))
} as const;
