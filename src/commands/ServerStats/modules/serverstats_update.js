import { PermissionFlagsBits } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { getServerCounters, saveServerCounters, updateCounter, getCounterEmoji, getCounterTypeLabel } from '../../../services/serverstatsService.js';
import { logger } from '../../../utils/logger.js';






import { InteractionHelper } from '../../../utils/interactionHelper.js';
export async function handleUpdate(interaction, client) {
    const guild = interaction.guild;
    const counterId = interaction.options.getString("counter-id");
    const newType = interaction.options.getString("type");

    // Defer reply immediately to ensure interaction is acknowledged
    try {
        await InteractionHelper.safeDefer(interaction);
    } catch (error) {
        logger.error("Failed to defer reply:", error);
        return;
    }

    // Check permissions after deferring
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await InteractionHelper.safeEditReply(interaction, { 
            embeds: [errorEmbed("Для обновления счетчиков вам необходимо разрешение **Управление каналами**.")]
        }).catch(logger.error);
        return;
    }

    if (!newType) {
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed("Для обновления необходимо указать новый тип счетчика.")]
        }).catch(logger.error);
        return;
    }

    try {
        const counters = await getServerCounters(client, guild.id);

        const counterIndex = counters.findIndex(c => c.id === counterId);
        if (counterIndex === -1) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed(`Счетчик с идентификатором \`${counterId}\` не найдено. Воспользуйся \`/counter list\` чтобы увидеть все счетчики.`)]
            }).catch(logger.error);
            return;
        }

        const counter = counters[counterIndex];
        const oldChannel = guild.channels.cache.get(counter.channelId);

        if (!oldChannel) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Канал для этого счетчика больше не существует. Вы не можете обновить счетчик для удаленного канала.")]
            }).catch(logger.error);
            return;
        }

        if (newType !== counter.type) {
            const existingTypeCounter = counters.find(c => c.type === newType && c.id !== counter.id);
            if (existingTypeCounter) {
                const existingChannel = guild.channels.cache.get(existingTypeCounter.channelId);
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed(`A **${getCounterTypeLabel(newType)}** Счетчик уже существует для этого сервера${existingChannel ? ` в ${existingChannel}` : ''}. Сначала удалите его, прежде чем использовать повторно.`)]
                }).catch(logger.error);
                return;
            }
        }

        const oldType = counter.type;

        counter.type = newType;
        counter.updatedAt = new Date().toISOString();

        const saved = await saveServerCounters(client, guild.id, counters);
        if (!saved) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Не удалось сохранить обновленные данные счетчика. Пожалуйста, попробуйте еще раз.")]
            }).catch(logger.error);
            return;
        }

        const updatedCounter = counters[counterIndex];
        const updated = await updateCounter(client, guild, updatedCounter);
        if (!updated) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Счетчик обновлен, но не удалось обновить название канала. Счетчик обновится при следующем запланированном запуске.")]
            }).catch(logger.error);
            return;
        }

        const finalChannel = guild.channels.cache.get(updatedCounter.channelId);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed(`✅ **Счетчик успешно обновлен!**\n\n**Идентификатор счетчика:** \`${counterId}\`\n**Изменен тип:** ${getCounterEmoji(oldType)} ${getCounterTypeLabel(oldType)} → ${getCounterEmoji(newType)} ${getCounterTypeLabel(newType)}\n\n**Текущие настройки:**\n**Тип:** ${getCounterEmoji(updatedCounter.type)} ${getCounterTypeLabel(updatedCounter.type)}\n**Канал:** ${finalChannel}\n**Название канала:** ${finalChannel.name}\n\nСчетчик будет автоматически обновляться каждые 15 минут.`)]
        }).catch(logger.error);

    } catch (error) {
        logger.error("Error updating counter:", error);
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed("An error occurred while updating the counter. Please try again.")]
        }).catch(logger.error);
    }
}



