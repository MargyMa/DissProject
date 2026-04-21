import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { sanitizeInput } from '../../utils/sanitization.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("reverse")
    .setDescription("Записывает ваш текст задом наперед.")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Текст, который нужно перевернуть.")
        .setRequired(true)
        .setMaxLength(1000),
    ),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      const originalText = interaction.options.getString("text");
      
      
      if (!originalText || originalText.trim().length === 0) {
        throw new TitanBotError(
          'Пустой текст для обратной команды',
          ErrorTypes.USER_INPUT,
          'Пожалуйста, введите текст для реверсивного поиска!'
        );
      }

      
      const sanitizedText = sanitizeInput(originalText, 1000);
      const reversedText = sanitizedText.split("").reverse().join("");

      const embed = successEmbed(
        "Обратный текст",
        `Оригинал: **${sanitizedText}**\nОбратный: **${reversedText}**`,
      );

      await InteractionHelper.safeReply(interaction, { embeds: [embed] });
      logger.debug(`Обратная команда, выполняемая пользователем ${interaction.user.id} в гильдии ${interaction.guildId}`);
    } catch (error) {
      logger.error('Ошибка обратной команды:', error);
      await handleInteractionError(interaction, error, {
        commandName: 'reverse',
        source: 'reverse_command'
      });
    }
  },
};


