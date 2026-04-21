import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const EMBED_DESCRIPTION_LIMIT = 4096;

export default {
    data: new SlashCommandBuilder()
    .setName("fight")
    .setDescription("Запускает имитацию текстового боя 1 на 1.")
    .addUserOption((option) =>
      option
        .setName("opponent")
        .setDescription("Пользователю для борьбы.")
        .setRequired(true),
    ),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      await InteractionHelper.safeDefer(interaction);

      const challenger = interaction.user;
      const opponent = interaction.options.getUser("opponent");

      
      if (challenger.id === opponent.id) {
        const embed = warningEmbed(
          `**${challenger.username}**, Ты не можешь бороться сам с собой! Это ничья еще до начала игры.`,
          "⚔️ Недействительный вызов"
        );
        return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      }

      
      if (opponent.bot) {
        const embed = warningEmbed(
          "Ты не можешь сражаться с ботами! Брось вызов реальному человеку.",
          "⚔️ Недействительный противник"
        );
        return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      }

      const winner = rand(0, 1) === 0 ? challenger : opponent;
      const loser = winner.id === challenger.id ? opponent : challenger;
      const rounds = rand(3, 7);
      const damage = rand(10, 50);

      const log = [];
      log.push(
        `💥 **${challenger.username}** проблемы **${opponent.username}** на дуэль! (Лучший из ${rounds} раундов)`,
      );

      for (let i = 1; i <= rounds; i++) {
        const attacker = rand(0, 1) === 0 ? challenger : opponent;
        const target = attacker.id === challenger.id ? opponent : challenger;
        const action = [
          "Наносит дикий удар кулаком",
          "Наносит критический удар",
          "Использует слабое заклинание",
          "Парирует и контратакует",
        ][rand(0, 3)];
        log.push(
          `\n**Круглый ${i}:** ${attacker.username} ${action} на ${target.username} для ${rand(1, damage)} повреждение!`,
        );
      }

      const outcomeText = log.join("\n");
      const winnerText = `👑 **${winner.username}** победил ${loser.username} и претендует на победу!`;
      const fullDescription = `${outcomeText}\n\n${winnerText}`;

      const description = fullDescription.length <= EMBED_DESCRIPTION_LIMIT
        ? fullDescription
        : `${fullDescription.slice(0, EMBED_DESCRIPTION_LIMIT - 15)}\n\n...`;

      const embed = successEmbed(
        description,
        "🏆 Дуэль завершена!"
      );

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      logger.debug(`Боевая команда, выполненная между ${challenger.id} and ${opponent.id} в гильдии ${interaction.guildId}`);
    } catch (error) {
      logger.error('Ошибка боевой команды:', error);
      await handleInteractionError(interaction, error, {
        commandName: 'fight',
        source: 'fight_command'
      });
    }
  },
};





