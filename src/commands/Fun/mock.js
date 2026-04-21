import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { sanitizeInput } from '../../utils/sanitization.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("mock")
    .setDescription("Превратите свой текст в песню.")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Текст для насмешек.")
        .setRequired(true)
        .setMaxLength(1000),
    ),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      const originalText = interaction.options.getString("text");
      
      
      if (!originalText || originalText.trim().length === 0) {
        throw new TitanBotError(
          'Пустой текст для имитации команды',
          ErrorTypes.USER_INPUT,
          'Пожалуйста, предоставьте текст для имитации!'
        );
      }

      
      const sanitizedText = sanitizeInput(originalText, 1000);

      let mockedText = "";
      for (let i = 0; i < sanitizedText.length; i++) {
        const char = sanitizedText[i];
        if (i % 2 === 0) {
          mockedText += char.toLowerCase();
        } else {
          mockedText += char.toUpperCase();
        }
      }

      const embed = successEmbed("sPoNgEbOb cAsE", `"${mockedText}"`);

      await InteractionHelper.safeReply(interaction, { embeds: [embed] });
      logger.debug(`Имитация команды, выполняемой пользователем ${interaction.user.id} в гильдии ${interaction.guildId}`);
    } catch (error) {
      logger.error('Имитация ошибки команды:', error);
      await handleInteractionError(interaction, error, {
        commandName: 'mock',
        source: 'mock_command'
      });
    }
  },
};


