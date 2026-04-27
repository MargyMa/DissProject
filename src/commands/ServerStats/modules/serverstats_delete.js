import { getColor } from '../../../config/bot.js';
import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, errorEmbed } from '../../../utils/embeds.js';
import { getServerCounters, saveServerCounters, getCounterEmoji, getCounterTypeLabel } from '../../../services/serverstatsService.js';
import { logger } from '../../../utils/logger.js';






import { InteractionHelper } from '../../../utils/interactionHelper.js';
export async function handleDelete(interaction, client) {
    const guild = interaction.guild;
    const counterId = interaction.options.getString("counter-id");
    
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
            embeds: [errorEmbed("Для удаления счетчиков вам потребуется разрешение **Управление каналами**.")]
        }).catch(logger.error);
        return;
    }

    try {
        const counters = await getServerCounters(client, guild.id);

        if (counters.length === 0) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Не найдено счетчиков для удаления.")]
            }).catch(logger.error);
            return;
        }

        const counterToDelete = counters.find(c => c.id === counterId);
        if (!counterToDelete) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed(`Счетчик с идентификатором \`${counterId}\` не найдено. Воспользуйся \`/counter list\` чтобы увидеть все счетчики.`)]
            }).catch(logger.error);
            return;
        }

        const channel = guild.channels.cache.get(counterToDelete.channelId);

        const embed = createEmbed({
            title: "⚠️ Удалить счетчик и канал",
            description: `Вы уверены, что хотите удалить этот счетчик и его канал??\n\n**Идентификатор:** \`${counterToDelete.id}\`\n**Тип:** ${getCounterTypeDisplay(counterToDelete.type)}\n**Канал:** ${channel || 'Удаленный канал'}\n\n⚠️ **Канал будет удален без возможности восстановления!**`,
            color: getColor('error')
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`counter-delete:confirm:${counterToDelete.id}:${interaction.user.id}`)
                .setLabel("Подтвердите удаление")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`counter-delete:cancel:${counterToDelete.id}:${interaction.user.id}`)
                .setLabel("Отменить")
                .setStyle(ButtonStyle.Secondary)
        );

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed], components: [row] }).catch(logger.error);

    } catch (error) {
        logger.error("Error in handleDelete:", error);
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed("An error occurred while fetching counters. Please try again.")]
        }).catch(logger.error);
    }
}







export async function performDeletionByCounterId(client, guild, counterId) {
    try {
        const counters = await getServerCounters(client, guild.id);

        const counter = counters.find(c => c.id === counterId);
        if (!counter) {
            return {
                success: false,
                message: `Счетчик с идентификатором \`${counterId}\` не был найден.`
            };
        }

        const updatedCounters = counters.filter(c => c.id !== counter.id);

        const saved = await saveServerCounters(client, guild.id, updatedCounters);
        if (!saved) {
            return {
                success: false,
                message: "Не удалось удалить счетчик. Пожалуйста, попробуйте еще раз."
            };
        }

        const channel = guild.channels.cache.get(counter.channelId);
        let channelDeleted = false;

        if (channel) {
            try {
                await channel.delete(`Счетчик удален - удаление канала: ${counter.id}`);
                channelDeleted = true;
            } catch (error) {
                logger.error("Error deleting channel:", error);
            }
        }

        let message = `✅ **Счетчик успешно удален!**\n\n**Идентификатор:** \`${counter.id}\`\n**Тип:** ${getCounterTypeDisplay(counter.type)}`;
        
        if (channelDeleted) {
            message += `\n**Канал:** ${channel.name} (удаленный)`;
        } else if (channel) {
            message += `\n**Канал:** ${channel.name} (не удалось удалить)`;
        } else {
            message += `\n**Канал:** Уже удален`;
        }

        return {
            success: true,
            message
        };

    } catch (error) {
        logger.error("Error deleting counter:", error);
        return {
            success: false,
            message: "An error occurred while deleting the counter. Please try again."
        };
    }
}






function getCounterTypeDisplay(type) {
    return `${getCounterEmoji(type)} ${getCounterTypeLabel(type)}`;
}



