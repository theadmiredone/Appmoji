import type { Attachment } from 'discord.js';

const MAX_EMOJI_BYTES = 256 * 1024;
const SUPPORTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);

export async function attachmentToDataUri(attachment: Attachment): Promise<string> {
  if (attachment.size > MAX_EMOJI_BYTES) {
    throw new Error('The image must be 256 KiB or smaller.');
  }

  const response = await fetch(attachment.url);
  if (!response.ok) throw new Error('Discord could not provide the uploaded image. Please upload it again.');

  const contentType = response.headers.get('content-type')?.split(';')[0]?.toLowerCase();
  if (!contentType || !SUPPORTED_TYPES.has(contentType)) {
    throw new Error('Upload a PNG, JPEG, GIF, WebP, or AVIF image.');
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_EMOJI_BYTES) throw new Error('The image must be 256 KiB or smaller.');

  return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
}
