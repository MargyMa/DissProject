import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Отображение аватара пользователя")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription(
          "Пользователь, чей аватар вы хотите видеть (по умолчанию — ваш)",
        ),
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser("target") || interaction.user;
      const avatarUrl = user.displayAvatarURL({ size: 2048, dynamic: true });

      const embed = createEmbed({ 
        title: `${user.username}'s Аватар`, 
        description: `[Ссылка для скачивания](${avatarUrl})` 
      })
        .setImage(avatarUrl);

      await InteractionHelper.safeReply(interaction, { embeds: [embed] });
      logger.info(`Avatar command executed`, {
        userId: interaction.user.id,
        targetUserId: user.id,
        guildId: interaction.guildId
      });
    } catch (error) {
      logger.error(`Avatar command execution failed`, {
        error: error.message,
        stack: error.stack,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'avatar'
      });
      await handleInteractionError(interaction, error, {
        commandName: 'avatar',
        source: 'avatar_command'
      });
    }
  }
};


