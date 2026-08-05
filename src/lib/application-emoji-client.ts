import { REST, RESTEvents } from '@discordjs/rest';
import { Routes, type APIEmoji, type RESTPostAPIApplicationEmojisJSONBody } from 'discord-api-types/v10';

export interface ApplicationEmojiList {
  items: APIEmoji[];
}

export class DiscordApiError extends Error {
  public constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'DiscordApiError';
  }
}

export class ApplicationEmojiClient {
  private readonly rest: REST;

  public constructor(
    private readonly applicationId: string,
    token: string
  ) {
    this.rest = new REST({ version: '10' }).setToken(token);
    this.rest.on(RESTEvents.RateLimited, (info) => {
      console.warn(`[REST] rate limited on ${info.route}; retrying after ${info.timeToReset}ms`);
    });
  }

  public async list(): Promise<APIEmoji[]> {
    return (await this.request<ApplicationEmojiList>('get', Routes.applicationEmojis(this.applicationId))).items;
  }

  public get(emojiId: string): Promise<APIEmoji> {
    return this.request('get', Routes.applicationEmoji(this.applicationId, emojiId));
  }

  public create(name: string, image: string): Promise<APIEmoji> {
    const body: RESTPostAPIApplicationEmojisJSONBody = { name, image };
    return this.request('post', Routes.applicationEmojis(this.applicationId), body);
  }

  public rename(emojiId: string, name: string): Promise<APIEmoji> {
    return this.request('patch', Routes.applicationEmoji(this.applicationId, emojiId), { name });
  }

  public async delete(emojiId: string): Promise<void> {
    await this.request('delete', Routes.applicationEmoji(this.applicationId, emojiId));
  }

  private async request<T>(method: 'get' | 'post' | 'patch' | 'delete', route: string, body?: unknown): Promise<T> {
    try {
      switch (method) {
        case 'get':
          return (await this.rest.get(route)) as T;
        case 'post':
          return (await this.rest.post(route, { body })) as T;
        case 'patch':
          return (await this.rest.patch(route, { body })) as T;
        case 'delete':
          return (await this.rest.delete(route)) as T;
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown Discord API error';
      const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500;
      throw new DiscordApiError(status, details);
    }
  }
}
