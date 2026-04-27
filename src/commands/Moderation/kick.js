import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Отключите пользователя от сервера")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("Пользователь, чтобы пнуть")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Причина для удара"),
    )
.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  category: "moderation",

  async execute(interaction, config, client) {
    try {
      
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        throw new TitanBotError(
          "Пользователю не хватает разрешения",
          ErrorTypes.PERMISSION,
          "У вас нет прав на удаление участников."
        );
      }

      const targetUser = interaction.options.getUser("target");
      const member = interaction.options.getMember("target");
      const reason = interaction.options.getString("reason") || "Причина не указана";

      
      if (targetUser.id === interaction.user.id) {
        throw new TitanBotError(
          "Не могу пнуть себя",
          ErrorTypes.VALIDATION,
          "Ты не можешь пнуть себя."
        );
      }

      
      if (targetUser.id === client.user.id) {
        throw new TitanBotError(
          "Не удается пнуть бота",
          ErrorTypes.VALIDATION,
          "Вы не можете пнуть бота."
        );
      }

      
      if (!member) {
        throw new TitanBotError(
          "Цель не найдена",
          ErrorTypes.USER_INPUT,
          "Целевой пользователь в данный момент не находится на этом сервере.",
          { subtype: 'user_not_found' }
        );
      }

      
      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        throw new TitanBotError(
          "Не удается выгнать пользователя",
          ErrorTypes.PERMISSION,
          "Вы не можете удалить пользователя с такой же или более высокой ролью, чем у вас."
        );
      }

      
      if (!member.kickable) {
        throw new TitanBotError(
          "Бот не может пнуть",
          ErrorTypes.PERMISSION,
          "Я не могу удалить этого пользователя. Пожалуйста, проверьте мою роль по отношению к целевому пользователю."
        );
      }

      
      await member.kick(reason);

      
      const caseId = await logModerationAction({
        client,
        guild: interaction.guild,
        event: {
          action: "Member Kicked",
          target: `${targetUser.tag} (${targetUser.id})`,
          executor: `${interaction.user.tag} (${interaction.user.id})`,
          reason,
          metadata: {
            userId: targetUser.id,
            moderatorId: interaction.user.id
          }
        }
      });

      
      await InteractionHelper.universalReply(interaction, {
        embeds: [
          successEmbed(
            `👢 **Выгнан** ${targetUser.tag}`,
            `**Причина:** ${reason}\n**Идентификатор обращения:** #${caseId}`,
          ),
        ],
      });
    } catch (error) {
      logger.error('Kick command error:', error);
      const errorEmbed_default = errorEmbed(
        "An unexpected error occurred while trying to kick the user.",
        error.message || "Could not kick the user"
      );
      await InteractionHelper.universalReply(interaction, { embeds: [errorEmbed_default] });
    }
  }
};



