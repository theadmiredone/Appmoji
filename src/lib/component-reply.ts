import { MessageFlags } from 'discord.js';
import { ComponentType, type APIContainerComponent } from 'discord-api-types/v10';

export function componentReply(content: string, ephemeral = false) {
  const components = [
    {
      type: ComponentType.Container,
      components: [
        {
          type: ComponentType.TextDisplay,
          content
        }
      ]
    }
  ] satisfies APIContainerComponent[];

  return {
    components,
    flags: ephemeral
      ? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      : MessageFlags.IsComponentsV2
  };
}
