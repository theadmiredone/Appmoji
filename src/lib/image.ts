import type { Attachment } from 'discord.js';

const MAX_EMOJI_BYTES = 256 * 1024;
const SUPPORTED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif'
]);

export async function attachmentToDataUri(attachment: Attachment): Promise<string> {
  if (attachment.size > MAX_EMOJI_BYTES) {
    throw new Error('The image must be 256 KiB or smaller.');
  }

  return imageUrlToDataUri(attachment.url);
}

export async function customEmojiToDataUri(value: string): Promise<string> {
  const match = /^<(a?):[a-zA-Z0-9_]{2,32}:(\d{17,20})>$/.exec(value.trim());
  if (!match) {
    throw new Error('Type a custom Discord emoji, for example <:party:123456789012345678>.');
  }

  const [, animated, emojiId] = match;
  if (!emojiId) throw new Error('The custom emoji ID is missing.');
  const extension = animated === 'a' ? 'gif' : 'webp';
  return imageUrlToDataUri(`https://cdn.discordapp.com/emojis/${emojiId}.${extension}`);
}

async function imageUrlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error('Discord could not provide the uploaded image. Please upload it again.');

  const contentType = response.headers.get('content-type')?.split(';')[0]?.toLowerCase();
  if (!contentType || !SUPPORTED_TYPES.has(contentType)) {
    throw new Error('Upload a PNG, JPEG, GIF, WebP, or AVIF image.');
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_EMOJI_BYTES) throw new Error('The image must be 256 KiB or smaller.');

  return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
}
