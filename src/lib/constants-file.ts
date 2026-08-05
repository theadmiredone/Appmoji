import { mkdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import type { APIEmoji } from 'discord-api-types/v10';

export const constantsFormats = [
  'discordjs-ts',
  'discordjs-js',
  'discordpy',
  'pycord',
  'hikari',
  'json',
  'dpp'
] as const;

export type ConstantsFormat = (typeof constantsFormats)[number];

interface EmojiConstant {
  identifier: string;
  name: string;
  markup: string;
}

export function createConstantsFile(format: ConstantsFormat, emojis: APIEmoji[]) {
  const values = toConstants(emojis);
  switch (format) {
    case 'discordjs-ts':
      return file('emojis.ts', `export const emojis = ${object(values)} as const;\n`);
    case 'discordjs-js':
      return file('emojis.js', `export const emojis = Object.freeze(${object(values)});\n`);
    case 'discordpy':
    case 'pycord':
    case 'hikari':
      return file('emojis.py', `EMOJIS = ${pythonObject(values)}\n`);
    case 'json':
      return file(
        'emojis.json',
        `${JSON.stringify(
          Object.fromEntries(values.map(({ name, markup }) => [name, markup])),
          null,
          2
        )}\n`
      );
    case 'dpp':
      return file(
        'emojis.hpp',
        `#pragma once\n\n#include <string_view>\n\nnamespace emojis {\n${values
          .map(
            ({ identifier, markup }) =>
              `inline constexpr std::string_view ${identifier} = "${markup}";`
          )
          .join('\n')}\n}\n`
      );
  }
}

function toConstants(emojis: APIEmoji[]): EmojiConstant[] {
  const used = new Set<string>();
  return emojis.flatMap((emoji) => {
    if (!emoji.id || !emoji.name) return [];
    const base = identifier(emoji.name);
    let unique = base;
    let suffix = 2;
    while (used.has(unique)) unique = `${base}_${suffix++}`;
    used.add(unique);
    return [{ identifier: unique, name: emoji.name, markup: emojiMarkup(emoji) }];
  });
}

function object(values: EmojiConstant[]): string {
  return `{\n${values
    .map(({ name, markup }) => `  ${JSON.stringify(name)}: ${JSON.stringify(markup)},`)
    .join('\n')}\n}`;
}

function pythonObject(values: EmojiConstant[]): string {
  return `{\n${values
    .map(({ name, markup }) => `    ${JSON.stringify(name)}: ${JSON.stringify(markup)},`)
    .join('\n')}\n}`;
}

function identifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^\d/, '_$&');
  return cleaned || 'emoji';
}

function emojiMarkup(emoji: APIEmoji): string {
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

function file(name: string, content: string) {
  return { name, content };
}

export async function saveConstantsFile(
  output: ReturnType<typeof createConstantsFile>,
  overwrite: boolean
): Promise<string> {
  const directory = resolve(process.cwd(), 'src', 'generated');
  const destination = resolve(directory, output.name);
  const relativePath = relative(directory, destination);
  if (relativePath.startsWith('..') || relativePath.includes(':')) {
    throw new Error('Refusing to write constants outside src/generated.');
  }

  await mkdir(directory, { recursive: true });
  try {
    await writeFile(destination, output.content, {
      encoding: 'utf8',
      flag: overwrite ? 'w' : 'wx'
    });
  } catch (error) {
    if (isFileExistsError(error)) {
      throw new Error(
        `src/generated/${output.name} already exists. Use overwrite:true to replace it.`
      );
    }
    throw error;
  }
  return `src/generated/${output.name}`;
}

function isFileExistsError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}
