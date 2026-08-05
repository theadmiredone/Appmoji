import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import type { APIEmoji } from 'discord-api-types/v10';
import { config } from '../config.js';
import { ApplicationEmojiClient, DiscordApiError } from '../lib/application-emoji-client.js';
import { componentReply } from '../lib/component-reply.js';
import {
  createConstantsFile,
  saveConstantsFile,
  type ConstantsFormat
} from '../lib/constants-file.js';
import { attachmentToDataUri, emojiSourceToDataUri } from '../lib/image.js';

export const data = new SlashCommandBuilder()
  .setName('emoji')
  .setDescription('Manage this application’s emojis.')
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((command) =>
    command
      .setName('list')
      .setDescription('List application emojis.')
      .addStringOption((option) =>
        option.setName('query').setDescription('Filter by emoji name.').setMaxLength(32)
      )
  )
  .addSubcommand((command) =>
    command
      .setName('constants')
      .setDescription('Download application emoji constants for a framework.')
      .addStringOption((option) =>
        option
          .setName('format')
          .setDescription('Framework or file format.')
          .setRequired(true)
          .addChoices(
            { name: 'discord.js (TypeScript)', value: 'discordjs-ts' },
            { name: 'discord.js (JavaScript)', value: 'discordjs-js' },
            { name: 'discord.py', value: 'discordpy' },
            { name: 'Pycord', value: 'pycord' },
            { name: 'Hikari', value: 'hikari' },
            { name: 'JSON', value: 'json' },
            { name: 'DPP (C++)', value: 'dpp' }
          )
      )
      .addBooleanOption((option) =>
        option.setName('save').setDescription('Save a copy to src/generated in the bot project.')
      )
      .addBooleanOption((option) =>
        option
          .setName('overwrite')
          .setDescription('Replace an existing generated file (only applies when save is true).')
      )
  )
  .addSubcommand((command) =>
    command
      .setName('add')
      .setDescription('Add an application emoji.')
      .addAttachmentOption((option) =>
        option.setName('image').setDescription('Emoji image (max 256 KiB).')
      )
      .addStringOption((option) =>
        option
          .setName('emoji')
          .setDescription('Custom server emoji or Discord CDN emoji URL.')
          .setMaxLength(200)
      )
      .addStringOption((option) =>
        option.setName('name').setDescription('Emoji name.').setMaxLength(32)
      )
  )
  .addSubcommand((command) =>
    command
      .setName('edit')
      .setDescription('Rename an application emoji.')
      .addStringOption((option) =>
        option
          .setName('emoji')
          .setDescription('Emoji to rename.')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((option) =>
        option.setName('name').setDescription('New emoji name.').setRequired(true).setMaxLength(32)
      )
  )
  .addSubcommand((command) =>
    command
      .setName('remove')
      .setDescription('Remove an application emoji.')
      .addStringOption((option) =>
        option
          .setName('emoji')
          .setDescription('Emoji to remove.')
          .setRequired(true)
          .setAutocomplete(true)
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  emojis: ApplicationEmojiClient
): Promise<void> {
  if (!interaction.inGuild() || !config.guildIds.includes(interaction.guildId)) {
    await interaction.reply(
      componentReply('This command is only available in configured guilds.', true)
    );
    return;
  }
  if (!(await canManage(interaction))) {
    await interaction.reply(
      componentReply('You are not allowed to manage application emojis.', true)
    );
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'list') {
      const query = interaction.options.getString('query')?.toLowerCase();
      const items = (await emojis.list()).filter(
        (emoji) => !query || emoji.name?.toLowerCase().includes(query)
      );
      await interaction.editReply(componentReply(renderList(items)));
      return;
    }
    if (subcommand === 'constants') {
      const output = createConstantsFile(
        interaction.options.getString('format', true) as ConstantsFormat,
        await emojis.list()
      );
      const save = interaction.options.getBoolean('save') ?? false;
      const savedPath = save
        ? await saveConstantsFile(output, interaction.options.getBoolean('overwrite') ?? false)
        : undefined;
      await interaction.editReply({
        ...componentReply(
          savedPath
            ? `**Emoji Constants Saved**\n\`${savedPath}\``
            : `**Emoji Constants Ready**\n\`${output.name}\``,
          false,
          output.name
        ),
        files: [{ attachment: Buffer.from(output.content), name: output.name }]
      });
      return;
    }
    if (subcommand === 'add') {
      const attachment = interaction.options.getAttachment('image');
      const emojiSource = interaction.options.getString('emoji');
      const name = interaction.options.getString('name');
      if (!name?.trim()) {
        await interaction.editReply(componentReply('Provide an emoji name.'));
        return;
      }
      if (Boolean(attachment) === Boolean(emojiSource)) {
        await interaction.editReply(
          componentReply('Provide one image source: an image attachment or a custom server emoji.')
        );
        return;
      }
      const image = attachment
        ? await attachmentToDataUri(attachment)
        : await emojiSourceToDataUri(emojiSource ?? '');
      const emoji = await emojis.create(name, image);
      await interaction.editReply(
        componentReply(`> Added App Emoji ${emojiMention(emoji)} \`${emojiMention(emoji)}\``)
      );
      return;
    }
    const emojiId = interaction.options.getString('emoji', true);
    if (subcommand === 'edit') {
      const emoji = await emojis.rename(emojiId, interaction.options.getString('name', true));
      await interaction.editReply(
        componentReply(`> Updated App Emoji ${emojiMention(emoji)} \`${emojiMention(emoji)}\``)
      );
      return;
    }
    const emoji = await emojis.get(emojiId);
    await emojis.delete(emojiId);
    await interaction.editReply(
      componentReply(`> Removed App Emoji ${emojiMention(emoji)} \`${emojiMention(emoji)}\``)
    );
  } catch (error) {
    await interaction.editReply(
      componentReply(`> **Could not manage the application emoji**\n${friendlyError(error)}`)
    );
  }
}

export async function autocomplete(
  interaction: AutocompleteInteraction,
  emojis: ApplicationEmojiClient
): Promise<void> {
  try {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = (await emojis.list())
      .filter((emoji) => emoji.name?.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((emoji) => ({
        name: `:${emoji.name ?? 'unnamed'}: (${emoji.id ?? 'unknown'})`.slice(0, 100),
        value: emoji.id ?? ''
      }))
      .filter((choice) => choice.value.length > 0);
    await interaction.respond(choices);
  } catch {
    await interaction.respond([]);
  }
}

async function canManage(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (config.managerUserIds.has(interaction.user.id)) return true;
  if (config.managerRoleIds.size === 0 || !interaction.guild) return false;

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    return member.roles.cache.some((role) => config.managerRoleIds.has(role.id));
  } catch {
    return false;
  }
}

function renderList(items: APIEmoji[]): string {
  if (items.length === 0) return '**Application Emojis**\nNo application emojis found.';
  const rows = items
    .slice(0, 40)
    .map((emoji) => `${emojiMention(emoji)} \`${emoji.name ?? 'unnamed'}\` — \`${emoji.id}\``);
  return `**Application Emojis (${items.length})**\n${rows.join('\n')}${items.length > 40 ? '\n…showing first 40.' : ''}`;
}

function emojiMention(emoji: APIEmoji): string {
  if (!emoji.id || !emoji.name) return ':unknown_emoji:';
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

function friendlyError(error: unknown): string {
  if (error instanceof DiscordApiError && error.status === 404) return 'Emoji not found.';
  if (error instanceof Error) return error.message.slice(0, 1_800);
  return 'Unknown error.';
}
