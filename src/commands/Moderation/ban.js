import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderationService.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
export default {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Отключение пользователя от сервера")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Пользователя забанить")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Причина бана"),
        )
.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        try {
            const user = interaction.options.getUser("target");
            const reason = interaction.options.getString("reason") || "Причина не указана";

            if (user.id === interaction.user.id) {
                throw new Error("Вы не можете забанить самого себя.");
            }
            if (user.id === client.user.id) {
                throw new Error("Вы не можете забанить бота.");
            }

            
            const result = await ModerationService.banUser({
                guild: interaction.guild,
                user,
                moderator: interaction.member,
                reason
            });

            await InteractionHelper.universalReply(interaction, {
                embeds: [
                    successEmbed(
                        `🚫 **Забанен** ${user.tag}`,
                        `**Причина:** ${reason}\n**Идентификатор обращения:** #${result.caseId}`,
                    ),
                ],
            });
        } catch (error) {
            logger.error('Bошибка в команде:', error);
            await handleInteractionError(interaction, error, { subtype: 'ban_failed' });
        }
    },
};



