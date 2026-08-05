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
   npm run deploy:commands
   npm run build
   npm start
   ```

For development, use `npm run dev`.

## Commands

- `/appemoji list [query]` — list the app's emojis.
- `/appemoji add image:<attachment> emoji:<custom-server-emoji-or-CDN-link> name:<name>` — add an emoji from exactly one source. `emoji` accepts typed custom emoji markup, such as `<:party:123456789012345678>`, or an official CDN link such as `https://cdn.discordapp.com/emojis/1530187698386501643.webp?size=32`.
- `/appemoji edit emoji:<emoji> name:<name>` — rename an emoji.
- `/appemoji remove emoji:<emoji>` — delete an emoji.

Commands are registered only in `DISCORD_GUILD_IDS`, cannot run in DMs, and default to Discord administrators. You can additionally allow particular users or roles via the optional manager environment variables; an administrator must enable the command for those non-admins in Discord's command permissions.

## Security and operations

- Keep `.env` private; it is excluded from Git.
- Application emojis belong to the application shared by every guild, so deletion is intentionally restricted.
- The bot validates attachment type and Discord's 256 KiB image limit before upload.
- The REST client uses Discord.js's rate-limit-aware REST implementation and logs any retryable rate-limit events.

See Discord's [application emoji documentation](https://docs.discord.com/developers/resources/emoji#list-application-emojis) and [application command documentation](https://docs.discord.com/developers/interactions/application-commands).
