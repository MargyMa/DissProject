import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { sanitizeInput } from '../../utils/sanitization.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export default {
    data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Рассчитайте уровень совместимости двух людей.")
    .addStringOption((option) =>
      option
        .setName("name1")
        .setDescription("Первый ник пользователя.")
        .setRequired(true)
        .setMaxLength(100),
    )
    .addStringOption((option) =>
      option
        .setName("name2")
        .setDescription("Второй ник пользователя.")
        .setRequired(true)
        .setMaxLength(100),
    ),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      await InteractionHelper.safeDefer(interaction);

      const name1Raw = interaction.options.getString("name1");
      const name2Raw = interaction.options.getString("name2");

      
      if (!name1Raw || name1Raw.trim().length === 0 || !name2Raw || name2Raw.trim().length === 0) {
        throw new TitanBotError(
          'Пустые имена, предоставленные в команде',
          ErrorTypes.USER_INPUT,
          'Пожалуйста, укажите полные имена обоих людей!'
        );
      }

      
      const name1 = sanitizeInput(name1Raw.trim(), 100);
      const name2 = sanitizeInput(name2Raw.trim(), 100);

      
      if (name1.toLowerCase() === name2.toLowerCase()) {
        const embed = warningEmbed(
          "💖 Оценка совместимости",
          `**${name1}** не могут быть доставлены сами по себе! Пожалуйста, выберите двух разных людей.`
        );
        return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      }

      const sortedNames = [name1, name2].sort();
      const combination = sortedNames.join("-").toLowerCase();
      const score = stringToHash(combination) % 101;

      let description;
      if (score === 100) {
        description = "Родственные души! Это судьба, они созданы друг для друга!";
      } else if (score >= 80) {
        description = "Идеальная пара! Готовьте свадебные колокольчики!";
      } else if (score >= 60) {
        description = "Сплошная химия. Определенно стоит изучить!";
      } else if (score >= 40) {
        description = "Статус «Просто друзья». Может быть, со временем?";
      } else if (score >= 20) {
        description = "Это непросто. Им может понадобиться личное пространство.";
      } else {
        description = "Нулевая совместимость. Бегите без оглядки!";
      }

      const progressBar =
        "█".repeat(Math.floor(score / 10)) +
        "░".repeat(10 - Math.floor(score / 10));

      const embed = successEmbed(
        `💖 Оценка совместимости: ${name1} vs ${name2}`,
        `Совместимость: **${score}%**\n\n\`${progressBar}\`\n\n*${description}*`,
      );

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      logger.debug(`Команда отправки, выполняемая пользователем ${interaction.user.id} в гильдии ${interaction.guildId}`);
    } catch (error) {
      logger.error('Ошибка командования кораблем:', error);
      await handleInteractionError(interaction, error, {
        commandName: 'ship',
        source: 'ship_command'
      });
    }
  },
};




