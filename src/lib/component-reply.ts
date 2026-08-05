import { MessageFlags } from 'discord.js';
import {
  ComponentType,
  type APIComponentInContainer,
  type APIContainerComponent
} from 'discord-api-types/v10';

export function componentReply(content: string, ephemeral = false, fileName?: string) {
  const children: APIComponentInContainer[] = [
    {
      type: ComponentType.TextDisplay,
      content
    }
  ];
  if (fileName) {
    children.push({
      type: ComponentType.File,
      file: { url: `attachment://${fileName}` }
    });
  }
  const components = [
    {
      type: ComponentType.Container,
      components: children
    }
  ] satisfies APIContainerComponent[];

  return {
    components,
    flags: ephemeral
      ? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      : MessageFlags.IsComponentsV2
  };
}
