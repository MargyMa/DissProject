import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
const facts = [
  "День на Венере длиннее года на Венере.",
  "Самая короткая война в истории произошла между Великобританией и Занзибаром 27 августа 1896 года. Она длилась от 38 до 45 минут..",
  "Слово «Strengths» — самое длинное слово в английском языке, в котором всего одна гласная буква..",
  "У осьминогов три сердца и голубая кровь.",
  "На Земле больше деревьев, чем звезд в галактике Млечный Путь.",
  "Считается, что общий вес всех муравьев на Земле примерно равен общему весу всех людей.",
];

export default {
    data: new SlashCommandBuilder()
    .setName("fact")
    .setDescription("Делится случайным интересным фактом."),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      const randomFact = facts[Math.floor(Math.random() * facts.length)];

      const embed = successEmbed("🧠 Вы знали?", `💡 **${randomFact}**`);

      await InteractionHelper.safeReply(interaction, { embeds: [embed] });
      logger.debug(`Команда Fact, выполняемая пользователем ${interaction.user.id} в гильдии ${interaction.guildId}`);
    } catch (error) {
      logger.error('Ошибка команды Fact:', error);
      await handleInteractionError(interaction, error, {
        commandName: 'fact',
        source: 'fact_command'
      });
    }
  },
};




