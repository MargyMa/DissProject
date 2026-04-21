import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Бросает кости, используя стандартную нотацию (e.g., 2d20, 1d6 + 5).")
    .addStringOption((option) =>
      option
        .setName("notation")
        .setDescription("Обозначение игры в кости (e.g., 2d6, 1d20 + 4)")
        .setRequired(true)
        .setMaxLength(50),
    ),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      await InteractionHelper.safeDefer(interaction);

      const notation = interaction.options
        .getString("notation")
        .toLowerCase()
        .replace(/\s/g, "");

      const match = notation.match(/^(\d*)d(\d+)([\+\-]\d+)?$/);

      if (!match) {
        throw new TitanBotError(
          `Недопустимое обозначение игры в кости: ${notation}`,
          ErrorTypes.USER_INPUT,
          'Недопустимая запись. Используйте такой формат, как `1d20` or `3d6+5`.'
        );
      }

      const numDice = parseInt(match[1] || "1", 10);
      const numSides = parseInt(match[2], 10);
      const modifier = parseInt(match[3] || "0", 10);

      
      if (numDice < 1 || numDice > 20) {
        throw new TitanBotError(
          `Запрошено слишком много кубиков: ${numDice}`,
          ErrorTypes.VALIDATION,
          'Пожалуйста, следите за количеством игральных костей 1 и 20.'
        );
      }

      if (numSides < 1 || numSides > 1000) {
        throw new TitanBotError(
          `Недопустимое количество сторон: ${numSides}`,
          ErrorTypes.VALIDATION,
          'Пожалуйста, укажите количество сторон 1 и 1000.'
        );
      }

      let rolls = [];
      let totalRoll = 0;

      for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * numSides) + 1;
        rolls.push(roll);
        totalRoll += roll;
      }

      const finalTotal = totalRoll + modifier;

      const resultsDetail =
        numDice > 1 ? `**Прокрутка:** ${rolls.join(" + ")}\n` : "";
      const modifierText = modifier !== 0 ? ` + (${modifier})` : "";

      const embed = successEmbed(
        `🎲 Прокрутка ${numDice}d${numSides}${modifier !== 0 ? match[3] : ""}`,
        `${resultsDetail}**Общая прокрутка:** ${totalRoll}${modifierText} = **${finalTotal}**`,
      );

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      logger.debug(`Команда Roll, выполняемая пользователем ${interaction.user.id} с обозначениями ${notation} в гильдии ${interaction.guildId}`);
    } catch (error) {
      await handleInteractionError(interaction, error, {
        commandName: 'roll',
        source: 'roll_command'
      });
    }
  },
};



