




import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getUserLevelData, getLevelingConfig, getXpForLevel } from '../../services/leveling.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Проверьте свой ранг и уровень или уровень другого пользователя")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Пользователь проверяет свой рейтинг')
        .setRequired(false)
    )
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

      const targetUser = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);

      if (!member) {
        throw new TitanBotError(
          `Пользователь ${targetUser.id} не найден в гильдии`,
          ErrorTypes.USER_INPUT,
          'Не удалось найти указанного пользователя на этом сервере.'
        );
      }

      const userData = await getUserLevelData(client, interaction.guildId, targetUser.id);

      const safeUserData = {
        level: userData?.level ?? 0,
        xp: userData?.xp ?? 0,
        totalXp: userData?.totalXp ?? 0
      };

      const xpNeeded = getXpForLevel(safeUserData.level + 1);
      const progress = xpNeeded > 0 ? Math.floor((safeUserData.xp / xpNeeded) * 100) : 0;
      const progressBar = createProgressBar(progress, 20);

      const embed = new EmbedBuilder()
        .setTitle(`${member.displayName}'s Rank`)
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: '📊 Уровень',
            value: safeUserData.level.toString(),
            inline: true
          },
          {
            name: '⭐ Опыт',
            value: `${safeUserData.xp}/${xpNeeded}`,
            inline: true
          },
          {
            name: '✨ Общий опыт',
            value: safeUserData.totalXp.toString(),
            inline: true
          },
          {
            name: `Продвижение к уровню ${safeUserData.level + 1}`,
            value: `${progressBar} ${progress}%`
          }
        )
        .setColor('#2ecc71')
        .setTimestamp();

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      logger.debug(`Рейтинг проверен для пользователя ${targetUser.id} в гильдии ${interaction.guildId}`);
    } catch (error) {
      logger.error('Ошибка команды ранжирования:', error);
      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'rank'
      });
    }
  }
};







function createProgressBar(percentage, length = 10) {
  if (percentage < 0 || percentage > 100) {
    percentage = Math.max(0, Math.min(100, percentage));
  }
  const filled = Math.round((percentage / 100) * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}



