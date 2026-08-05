# Appmoji

Appmoji is a TypeScript Discord bot for managing **application-owned emojis** through guild-only slash commands. These are emojis owned by the Discord application—not emojis installed on a Discord server.

It uses the Discord Gateway only for interactions and Discord's REST API for the application emoji endpoints:

- `GET /applications/{application.id}/emojis`
- `POST /applications/{application.id}/emojis`
- `PATCH /applications/{application.id}/emojis/{emoji.id}`
- `DELETE /applications/{application.id}/emojis/{emoji.id}`

## Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and supply the application ID, bot token, and the guild IDs that may receive commands.
3. In the Discord Developer Portal, add the bot to each configured guild with the `applications.commands` and `bot` scopes.
4. Install dependencies and deploy the guild commands:

   ```sh
   npm install
   npm start
   ```

`npm start` builds the TypeScript project, deploys the configured guild commands, then starts the bot.

For development, use `npm run dev`.

### Environment variables

Set these in `.env` after copying `.env.example`:

```dotenv
APPLICATION_ID=123456789012345678
APP_TOKEN=your_bot_token
GUILD_IDS=123456789012345678,234567890123456789
USER_ID=345678901234567890, 456789012345678901
ROLE_ID=567890123456789012,678901234567890123
EMOJI_SYNC_GUILD_IDS=789012345678901234,890123456789012345
```

Use commas to separate multiple guild, user, or role IDs. A space after a comma is optional; Appmoji trims it. Leave `USER_ID=` or `ROLE_ID=` empty when no additional users or roles should manage emojis.

`EMOJI_SYNC_GUILD_IDS` is optional. On every startup, Appmoji copies each configured guild's custom emojis into the application, skipping names that already exist. Leave it empty to disable the sync. The bot must be a member of every listed guild.

## Commands

- `/emoji list [query]` — list the app's emojis.
- `/emoji constants format:<framework> [save:true] [overwrite:true]` — download application emoji constants for discord.js (TypeScript or JavaScript), discord.py, Pycord, Hikari, JSON, or DPP (C++). `save:true` also writes the file to `src/generated/`; existing files are protected unless `overwrite:true` is explicitly supplied.
- `/emoji add image:<attachment> emoji:<custom-server-emoji-or-CDN-link> name:<name>` — add an emoji from exactly one source. `emoji` accepts typed custom emoji markup, such as `<:party:123456789012345678>`, or an official CDN link such as `https://cdn.discordapp.com/emojis/1530187698386501643.webp?size=32`.
- `/emoji edit emoji:<emoji> name:<name>` — rename an emoji.
- `/emoji remove emoji:<emoji>` — delete an emoji.

Commands are registered only in `GUILD_IDS`, cannot run in DMs, and default to Discord administrators. You can additionally allow particular users or roles via `USER_ID` and `ROLE_ID`; an administrator must enable the command for those non-admins in Discord's command permissions.

## Security and operations

- Keep `.env` private; it is excluded from Git.
- Application emojis belong to the application shared by every guild, so deletion is intentionally restricted.
- The bot validates attachment type and Discord's 256 KiB image limit before upload.
- The REST client uses Discord.js's rate-limit-aware REST implementation and logs any retryable rate-limit events.

See Discord's [application emoji documentation](https://docs.discord.com/developers/resources/emoji#list-application-emojis) and [application command documentation](https://docs.discord.com/developers/interactions/application-commands).
