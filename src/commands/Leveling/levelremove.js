




import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { checkUserPermissions } from '../../utils/permissionGuard.js';
import { removeLevels, getUserLevelData, getLevelingConfig } from '../../services/leveling.js';
import { createEmbed } from '../../utils/embeds.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
  data: new SlashCommandBuilder()
    .setName('levelremove')
    .setDescription('Удаление уровней у пользователя')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Пользователь удаляет уровни')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('levels')
        .setDescription('Количество уровней, которые нужно удалить')
        .setRequired(true)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  category: 'Leveling',

  





  async execute(interaction, config, client) {
    try {
      await InteractionHelper.safeDefer(interaction);

      
      const hasPermission = await checkUserPermissions(
        interaction,
        PermissionFlagsBits.ManageGuild,
        'Для использования этой команды вам необходимо разрешение ManageGuild.'
      );
      if (!hasPermission) return;

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

      const targetUser = interaction.options.getUser('user');
      const levelsToRemove = interaction.options.getInteger('levels');

      
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        throw new TitanBotError(
          `Пользователь ${targetUser.id} не найден в этой гильдии`,
          ErrorTypes.USER_INPUT,
          'Указанный пользователь не зарегистрирован на этом сервере.'
        );
      }

      
      const userData = await getUserLevelData(client, interaction.guildId, targetUser.id);
      if (userData.level === 0) {
        throw new TitanBotError(
          `Пользователь ${targetUser.id} находится уже на минимальном уровне`,
          ErrorTypes.VALIDATION,
          `${targetUser.tag} уже имеет нулевой уровень и не может быть понижен.`
        );
      }

      
      const updatedData = await removeLevels(client, interaction.guildId, targetUser.id, levelsToRemove);

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          createEmbed({
            title: '✅ Удаленные уровни',
            description: `Успешно удален ${levelsToRemove} уровни от ${targetUser.tag}.\n**Новый уровень:** ${updatedData.level}`,
            color: 'success'
          })
        ]
      });

      logger.info(
        `[ADMIN] User ${interaction.user.tag} removed ${levelsToRemove} levels from ${targetUser.tag} in guild ${interaction.guildId}`
      );
    } catch (error) {
      logger.error('LevelRemove command error:', error);
      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'levelremove'
      });
    }
  }
};


