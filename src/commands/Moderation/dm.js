import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { sanitizeMarkdown } from '../../utils/sanitization.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName("dm")
        .setDescription("Отправьте пользователю личное сообщение (Только для сотрудников)")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Пользователь, которому нужно отправить личное сообщение")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Сообщение для отправки")
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName("anonymous")
                .setDescription("Отправьте сообщение анонимно (default: false)")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    category: "Moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`DM interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'dm'
            });
            return;
        }

    const targetUser = interaction.options.getUser("user");
        const message = interaction.options.getString("message");
        const anonymous = interaction.options.getBoolean("anonymous") || false;

        try {
            
            if (message.length > 2000) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed(
                            "Сообщение слишком длинное",
                            "Сообщения должны содержать не более 2000 символов."
                        ),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            
            if (targetUser.bot) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed(
                            "Не удается отправить DM-боту",
                            "Вы не можете отправлять личные сообщения ботам."
                        ),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            
            const sanitized = sanitizeMarkdown(message);

            const dmChannel = await targetUser.createDM();
            
            await dmChannel.send({
                embeds: [
                    successEmbed(
                        anonymous ? "Сообщение от команды сотрудников" : `Сообщение от ${interaction.user.tag}`,
                        sanitized
                    ).setFooter({
                        text: `Вы не можете ответить на это сообщение. | Идентификатор регистратора: ${interaction.id}`
                    })
                ]
            });

            await logEvent({
                client: interaction.client,
                guild: interaction.guild,
                event: {
                    action: "Отправлено DM",
                    target: `${targetUser.tag} (${targetUser.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: `Анонимный: ${anonymous ? 'Да' : 'Нет'}`,
                    metadata: {
                        userId: targetUser.id,
                        moderatorId: interaction.user.id,
                        anonymous,
                        messageLength: sanitized.length
                    }
                }
            });

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        "Отправлено DM",
                        `Успешно отправлено сообщение на ${targetUser.tag}`
                    ),
                ],
            });
        } catch (error) {
            logger.error('DM command error:', error);
            
if (error.code === 50007) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed("Ошибка", `Не удалось отправить личное сообщение ${targetUser.tag}. Возможно, у них отключены личные сообщения.`),
                    ],
                });
            }
            
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed("Ошибка", `Не удалось отправить DM: ${error.message}`),
                ],
            });
        }
    }
};


