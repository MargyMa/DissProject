import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("flip")
    .setDescription("Подбрасывает монетку (орел или решка)."),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      const result = Math.random() < 0.5 ? "Heads" : "Tails";
      const emoji = result === "Heads" ? "🪙" : "🔮";

      const embed = successEmbed(
        "Орел или решка?",
        `Монета упала на... **${result}** ${emoji}!`,
      );

      await InteractionHelper.safeReply(interaction, { embeds: [embed] });
      logger.debug(`Команда Flip, выполняемая пользователем ${interaction.user.id} в гильдии ${interaction.guildId}`);
    } catch (error) {
      logger.error('Ошибка команды переворота:', error);
      await handleInteractionError(interaction, error, {
        commandName: 'flip',
        source: 'flip_command'
      });
    }
  },
};



