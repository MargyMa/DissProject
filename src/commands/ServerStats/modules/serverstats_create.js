import { PermissionFlagsBits, ChannelType } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { getServerCounters, saveServerCounters, updateCounter, getCounterBaseName, getCounterTypeLabel } from '../../../services/serverstatsService.js';
import { logger } from '../../../utils/logger.js';






import { InteractionHelper } from '../../../utils/interactionHelper.js';
export async function handleCreate(interaction, client) {
    const guild = interaction.guild;
    const type = interaction.options.getString("type");
    const channelType = interaction.options.getString("channel_type");
    const category = interaction.options.getChannel("category");

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
            embeds: [errorEmbed("You need **Manage Channels** permission to create counters.")]
        }).catch(logger.error);
        return;
    }

    try {
        if (!category || category.type !== ChannelType.GuildCategory) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Пожалуйста, выберите подходящую категорию для канала счетчика.")]
            }).catch(logger.error);
            return;
        }

        const targetChannelType = channelType === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
        const baseChannelName = getCounterBaseName(type);

        const counters = await getServerCounters(client, guild.id);

        const duplicateType = counters.find(counter => counter.type === type);

        if (duplicateType) {
            const duplicateChannel = guild.channels.cache.get(duplicateType.channelId);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed(`A **${getCounterTypeLabel(type)}** Счетчик уже существует для этого сервера${duplicateChannel ? ` in ${duplicateChannel}` : ''}. Сначала удалите его, прежде чем создавать новый.`)]
            }).catch(logger.error);
            return;
        }

        const targetChannel = await guild.channels.create({
            name: baseChannelName,
            type: targetChannelType,
            parent: category.id,
            reason: `Встречный канал, созданный с помощью ${interaction.user.tag}`
        });

        const existingCounter = counters.find(c => c.channelId === targetChannel.id);
        if (existingCounter) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed(`Для канала уже существует счетчик **${targetChannel.name}**. Пожалуйста, сначала удалите его или выберите другой тип.`)]
            }).catch(logger.error);
            return;
        }

        const newCounter = {
            id: Date.now().toString(),
            type: type,
            channelId: targetChannel.id,
            guildId: guild.id,
            createdAt: new Date().toISOString(),
            enabled: true
        };

        counters.push(newCounter);

        const saved = await saveServerCounters(client, guild.id, counters);
        if (!saved) {
            await targetChannel.delete('Ошибка создания счетчика во время сохранения').catch(() => null);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Не удалось сохранить данные счетчика. Пожалуйста, попробуйте еще раз.")]
            }).catch(logger.error);
            return;
        }

        const updated = await updateCounter(client, guild, newCounter);
        if (!updated) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Счетчик создан, но не удалось обновить название канала. Счетчик обновится при следующем запланированном запуске.")]
            }).catch(logger.error);
            return;
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed(`✅ **Счетчик успешно создан!**\n\n**Тип:** ${getCounterTypeLabel(type)}\n**Тип канала:** ${targetChannel.type === ChannelType.GuildVoice ? 'voice' : 'text'}\n**Категория:** ${category}\n**Канал:** ${targetChannel}\n**Название канала:** ${targetChannel.name}\n**Идентификатор счетчика:** \`${newCounter.id}\`\n\nСчетчик будет автоматически обновляться каждые 15 минут.\n\nВоспользуйся \`/counter list\` чтобы просмотреть все счетчики.`)]
        }).catch(logger.error);

    } catch (error) {
        logger.error("Error creating counter:", error);
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed("Произошла ошибка при создании счетчика. Пожалуйста, попробуйте еще раз.")]
        }).catch(logger.error);
    }
}



