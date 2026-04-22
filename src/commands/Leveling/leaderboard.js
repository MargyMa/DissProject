




import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getLeaderboard, getLevelingConfig, getXpForLevel } from '../../services/leveling.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription("Отображает таблицу лидеров по уровням сервера")
    .setDMPermission(false),
  category: 'Leveling',

  





  async execute(interaction, config, client) {
    try {
      await InteractionHelper.safeDefer(interaction);

      const levelingConfig = await getLevelingConfig(client, interaction.guildId);

      if (!levelingConfig?.enabled) {
        await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            new EmbedBuilder()
              .setColor('#f1c40f')
              .setDescription('На этом сервере система повышения уровня в настоящее время отключена.')
          ],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const leaderboard = await getLeaderboard(client, interaction.guildId, 10);

      if (leaderboard.length === 0) {
        throw new TitanBotError(
          'Данные таблицы лидеров не найдены',
          ErrorTypes.DATABASE,
          'Данные об уровне пока не найдены. Начните общаться, чтобы получить опыт!'
        );
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Таблица лидеров уровней')
        .setColor('#2ecc71')
        .setDescription("10 самых активных участников этого сервера:")
        .setTimestamp();

      const leaderboardText = await Promise.all(
        leaderboard.map(async (user, index) => {
          try {
            const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
            const userMention = member?.user.toString() || `<@${user.userId}>`;
            const xpForNextLevel = getXpForLevel(user.level + 1);

            let rankPrefix = `${index + 1}.`;
            if (index === 0) rankPrefix = '🥇';
            else if (index === 1) rankPrefix = '🥈';
            else if (index === 2) rankPrefix = '🥉';
            else rankPrefix = `**${index + 1}.**`;

            return `${rankPrefix} ${userMention} - Level ${user.level} (${user.xp}/${xpForNextLevel} XP)`;
          } catch {
            return `**${index + 1}.** Error loading user ${user.userId}`;
          }
        })
      );

      embed.addFields({
        name: 'Ранги',
        value: leaderboardText.join('\n')
      });

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      logger.debug(`Leaderboard displayed for guild ${interaction.guildId}`);
    } catch (error) {
      logger.error('Leaderboard command error:', error);
      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'leaderboard'
      });
    }
  }
};



