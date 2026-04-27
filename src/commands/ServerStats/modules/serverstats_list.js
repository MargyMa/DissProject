import { getColor } from '../../../config/bot.js';
import { PermissionFlagsBits } from 'discord.js';
import { createEmbed, errorEmbed } from '../../../utils/embeds.js';
import { getServerCounters, saveServerCounters, getCounterEmoji as getCounterTypeEmoji, getCounterTypeLabel, getGuildCounterStats } from '../../../services/serverstatsService.js';
import { logger } from '../../../utils/logger.js';






import { InteractionHelper } from '../../../utils/interactionHelper.js';
export async function handleList(interaction, client) {
    const guild = interaction.guild;
    
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
            embeds: [errorEmbed("Для просмотра счетчиков вам необходимо разрешение **Управление каналами**.")]
        }).catch(logger.error);
        return;
    }

    try {
        const counters = await getServerCounters(client, guild.id);
        const stats = await getGuildCounterStats(guild);

        // Clean up counters with deleted channels
        const validCounters = [];
        const orphanedCounters = [];
        
        for (const counter of counters) {
            const channel = guild.channels.cache.get(counter.channelId);
            if (channel) {
                validCounters.push(counter);
            } else {
                orphanedCounters.push(counter);
                logger.info(`Removing orphaned counter ${counter.id} (type: ${counter.type}, deleted channel: ${counter.channelId}) from guild ${guild.id}`);
            }
        }
        
        // Save cleaned counters if any were orphaned
        if (orphanedCounters.length > 0) {
            await saveServerCounters(client, guild.id, validCounters);
            logger.info(`Cleaned up ${orphanedCounters.length} orphaned counter(s) from guild ${guild.id}`);
        }

        if (validCounters.length === 0) {
            const embed = createEmbed({
                title: "📋 Счетчики серверов",
                description: "Для этого сервера счетчики еще не настроены.\n\nВоспользуйся `/counter create` как установить свой первый счетчик!",
                color: getColor('warning')
            });

            embed.addFields({
                name: "🔧 **Доступные типы счетчиков**",
                value: "👥 **Участники + Боты** - Общее количество участников сервера\n👤 **Только для участников** - Только для людей-участников\n🤖 **Только боты** - Только для пользователей ботов",
                inline: false
            });

            embed.addFields({
                name: "📝 **Примеры использования**",
                value: "`/counter create type:members channel_type:voice category:Статистика`\n`/counter create type:bots channel_type:text category:Информация о сервере`\n`/counter list`",
                inline: false
            });

            embed.setFooter({ 
                text: "Встречная система • Автоматические обновления каждые 15 минут" 
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] }).catch(logger.error);
            return;
        }

        const embed = createEmbed({
            title: `📋 Счетчики серверов (${validCounters.length})`,
            description: "Вот все активные счетчики для этого сервера.\n\nСчетчики автоматически обновляются каждые 15 минут.",
            color: getColor('info')
        });

        for (let i = 0; i < validCounters.length; i++) {
            const counter = validCounters[i];
            const channel = guild.channels.cache.get(counter.channelId);
            
            if (!channel) {
                // This should not happen since we filtered above, but keep as safety check
                logger.warn(`Counter ${counter.id} still has missing channel after cleanup`);
                continue;
            }

            const currentCount = getCurrentCount(stats, counter.type);
            const status = channel.name.includes(':') ? '✅ Active' : '⚠️ Not Updated';
            
            embed.addFields({
                name: `${getCounterTypeEmoji(counter.type)} Counter #${i + 1} - ${channel.name}`,
                value: `**Идентификатор:** \`${counter.id}\`\n**Тип:** ${getCounterTypeDisplay(counter.type)}\n**Канал:** ${channel}\n**Текущий счетчик:** ${currentCount}\n**Статус:** ${status}\n**Созданный:** ${new Date(counter.createdAt).toLocaleDateString()}`,
                inline: false
            });
        }

        embed.addFields({
            name: "📊 **Статистика**",
            value: `**Общее количество счетчиков:** ${validCounters.length}\n**Активные счетчики:** ${validCounters.filter(c => {
                const channel = guild.channels.cache.get(c.channelId);
                return channel && channel.name.includes(':');
            }).length}\n**Следующее обновление:** <t:${Math.floor(Date.now() / 1000) + 900}:R>`,
            inline: false
        });

        embed.addFields({
            name: "🔧 **Команды управления**",
            value: "`/counter create` - Создайте новый счетчик\n`/counter update` - Обновить существующий счетчик\n`/counter delete` - Удалить счетчик",
            inline: false
        });

        embed.setFooter({ 
            text: "Система счетчиков • Автоматическое обновление каждые 15 минут" 
        });
        embed.setTimestamp();

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] }).catch(logger.error);

    } catch (error) {
        logger.error("Error displaying counters:", error);
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed("An error occurred while fetching counters. Please try again.")]
        }).catch(logger.error);
    }
}






function getCounterTypeDisplay(type) {
    return `${getCounterTypeEmoji(type)} ${getCounterTypeLabel(type)}`;
}






function getCounterEmoji(type) {
    return getCounterTypeEmoji(type);
}







function getCurrentCount(stats, type) {
    switch (type) {
        case "members":
            return stats.totalCount;
        case "bots":
            return stats.botCount;
        case "members_only":
            return stats.humanCount;
        default:
            return 0;
    }
}



