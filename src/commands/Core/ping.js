import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Проверяет задержку бота и скорость работы API"),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Не удалось выполнить отсрочку взаимодействия Ping`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'ping'
            });
            return;
        }

        try {
            await InteractionHelper.safeEditReply(interaction, {
                content: "Раздающийся сигнал...",
            });

            const latency = Date.now() - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);

            const embed = createEmbed({ title: "🏓 Pong!", description: null }).addFields(
                { name: "Bot Latency", value: `${latency}ms`, inline: true },
                { name: "API Latency", value: `${apiLatency}ms`, inline: true },
            );

            await InteractionHelper.safeEditReply(interaction, {
                content: null,
                embeds: [embed],
            });
        } catch (error) {
            logger.error('Ошибка команды проверки связи:', error);
            try {
                return await InteractionHelper.safeReply(interaction, {
                    embeds: [createEmbed({ title: 'Системная ошибка', description: 'В данный момент не удалось определить задержку.', color: 'error' })],
                    flags: MessageFlags.Ephemeral,
                });
            } catch (replyError) {
                logger.error('Не удалось отправить ответ с ошибкой:', replyError);
            }
        }
    },
};




