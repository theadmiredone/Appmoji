import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import type { APIEmoji } from 'discord-api-types/v10';
import { config } from '../config.js';
import { ApplicationEmojiClient, DiscordApiError } from '../lib/application-emoji-client.js';
import { attachmentToDataUri } from '../lib/image.js';

export const data = new SlashCommandBuilder()
  .setName('appemoji')
  .setDescription('Manage this application’s emojis.')
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((command) =>
    command.setName('list').setDescription('List application emojis.').addStringOption((option) =>
      option.setName('query').setDescription('Filter by emoji name.').setMaxLength(32)
    )
  )
  .addSubcommand((command) =>
    command
      .setName('add')
      .setDescription('Add an application emoji.')
      .addStringOption((option) => option.setName('name').setDescription('Emoji name.').setRequired(true).setMaxLength(32))
      .addAttachmentOption((option) => option.setName('image').setDescription('Emoji image (max 256 KiB).').setRequired(true))
  )
  .addSubcommand((command) =>
    command
      .setName('edit')
      .setDescription('Rename an application emoji.')
      .addStringOption((option) => option.setName('emoji').setDescription('Emoji to rename.').setRequired(true).setAutocomplete(true))
      .addStringOption((option) => option.setName('name').setDescription('New emoji name.').setRequired(true).setMaxLength(32))
  )
  .addSubcommand((command) =>
    command
      .setName('remove')
      .setDescription('Remove an application emoji.')
      .addStringOption((option) => option.setName('emoji').setDescription('Emoji to remove.').setRequired(true).setAutocomplete(true))
  );

export async function execute(interaction: ChatInputCommandInteraction, emojis: ApplicationEmojiClient): Promise<void> {
  if (!interaction.inGuild() || !config.guildIds.includes(interaction.guildId)) {
    await interaction.reply({ content: 'This command is only available in configured guilds.', ephemeral: true });
    return;
  }
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'You are not allowed to manage application emojis.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'list') {
      const query = interaction.options.getString('query')?.toLowerCase();
      const items = (await emojis.list()).filter((emoji) => !query || emoji.name?.toLowerCase().includes(query));
      await interaction.editReply(renderList(items));
      return;
    }
    if (subcommand === 'add') {
      const attachment = interaction.options.getAttachment('image', true);
      const emoji = await emojis.create(interaction.options.getString('name', true), await attachmentToDataUri(attachment));
      await interaction.editReply(`Added application emoji **:${emoji.name}:** (\`${emoji.id}\`).`);
      return;
    }
    const emojiId = interaction.options.getString('emoji', true);
    if (subcommand === 'edit') {
      const emoji = await emojis.rename(emojiId, interaction.options.getString('name', true));
      await interaction.editReply(`Renamed application emoji to **:${emoji.name}:**.`);
      return;
    }
    await emojis.delete(emojiId);
    await interaction.editReply('Application emoji removed.');
  } catch (error) {
    await interaction.editReply(`Could not manage the application emoji: ${friendlyError(error)}`);
  }
}

export async function autocomplete(interaction: AutocompleteInteraction, emojis: ApplicationEmojiClient): Promise<void> {
  try {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = (await emojis.list())
      .filter((emoji) => emoji.name?.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((emoji) => ({ name: `:${emoji.name ?? 'unnamed'}: (${emoji.id ?? 'unknown'})`.slice(0, 100), value: emoji.id ?? '' }))
      .filter((choice) => choice.value.length > 0);
    await interaction.respond(choices);
  } catch {
    await interaction.respond([]);
  }
}

function canManage(interaction: ChatInputCommandInteraction): boolean {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (config.managerUserIds.has(interaction.user.id)) return true;
  const member = interaction.member;
  return !('roles' in member) ? false : member.roles.cache.some((role) => config.managerRoleIds.has(role.id));
}

function renderList(items: APIEmoji[]): string {
  if (items.length === 0) return 'No application emojis found.';
  const rows = items.slice(0, 100).map((emoji) => `• **:${emoji.name ?? 'unnamed'}:** \`${emoji.id}\`${emoji.animated ? ' (animated)' : ''}`);
  return `Application emojis (${items.length}):\n${rows.join('\n')}${items.length > 100 ? '\n…showing first 100.' : ''}`;
}

function friendlyError(error: unknown): string {
  if (error instanceof DiscordApiError && error.status === 404) return 'Emoji not found.';
  if (error instanceof Error) return error.message.slice(0, 1_800);
  return 'Unknown error.';
}
