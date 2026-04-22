import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';


import { InteractionHelper } from '../../utils/interactionHelper.js';
const durationChoices = [
    { name: "5 минут", value: 5 },
    { name: "10 минут", value: 10 },
    { name: "30 минут", value: 30 },
    { name: "1 час", value: 60 },
    { name: "6 часов", value: 360 },
    { name: "1 день", value: 1440 },
    { name: "1 неделя", value: 10080 },
];
export default {
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Блокировка пользователя на определенное время.")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Пользователь тауйм-аута")
                .setRequired(true),
        )
        .addIntegerOption(
            (option) =>
                option
                    .setName("duration")
                    .setDescription("Продолжительность тайм-аута")
                    .setRequired(true)
.addChoices(...durationChoices),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Причина тайм-аута"),
        )
.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Сбой задержки взаимодействия по тайм-ауту`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'timeout'
            });
            return;
        }

        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                throw new TitanBotError(
                    "Пользователю не хватает разрешения",
                    ErrorTypes.PERMISSION,
                    "Чтобы установить тайм-аут, вам нужно разрешение «Для модераторов»."
                );
            }

            const targetUser = interaction.options.getUser("target");
            const member = interaction.options.getMember("target");
            const durationMinutes = interaction.options.getInteger("duration");
            const reason = interaction.options.getString("reason") || "Причина не указана";

            if (targetUser.id === interaction.user.id) {
                throw new TitanBotError(
                    "Не удается выполнить тайм-аут самостоятельно",
                    ErrorTypes.VALIDATION,
                    "Вы не можете сами взять тайм-аут."
                );
            }
            if (targetUser.id === client.user.id) {
                throw new TitanBotError(
                    "Не удается отключить тайм-аут бота",
                    ErrorTypes.VALIDATION,
                    "Вы не можете отключить бота по тайм-ауту."
                );
            }
            if (!member) {
                throw new TitanBotError(
                    "Цель не найдена",
                    ErrorTypes.USER_INPUT,
                    "Целевой пользователь в данный момент не находится на этом сервере."
                );
            }

            if (!member.moderatable) {
                throw new TitanBotError(
                    "Не удается истечь времени ожидания участника",
                    ErrorTypes.PERMISSION,
                    "Я не могу заблокировать этого пользователя. Возможно, у него более высокий статус, чем у меня или у вас."
                );
            }

            const durationMs = durationMinutes * 60 * 1000;
            await member.timeout(durationMs, reason);

            const durationDisplay =
                durationChoices.find((c) => c.value === durationMinutes)
                    ?.name || `${durationMinutes} minutes`;

            const caseId = await logModerationAction({
                client,
                guild: interaction.guild,
                event: {
                    action: "Время ожидания участника истекло",
                    target: `${targetUser.tag} (${targetUser.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: `${reason}\nDuration: ${durationDisplay}`,
                    duration: durationDisplay,
                    metadata: {
                        userId: targetUser.id,
                        moderatorId: interaction.user.id,
                        durationMinutes,
                        timeoutEnds: new Date(Date.now() + durationMs).toISOString()
                    }
                }
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        `⏳ **Тайм-Аут** ${targetUser.tag} для ${durationDisplay}.`,
                        `**Причина:** ${reason}\n**Идентификатор обращения:** #${caseId}`,
                    ),
                ],
            });
        } catch (error) {
            logger.error('Ошибка команды тайм-аута:', error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed(
                        error.userMessage || "Произошла непредвиденная ошибка при выполнении действия с таймаутом. Пожалуйста, проверьте мои права доступа.",
                    ),
                ],
            });
        }
    }
};



