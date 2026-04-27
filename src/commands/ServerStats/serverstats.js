import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

import { handleCreate } from './modules/serverstats_create.js';
import { handleList } from './modules/serverstats_list.js';
import { handleUpdate } from './modules/serverstats_update.js';
import { handleDelete } from './modules/serverstats_delete.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName("serverstats")
        .setDescription("Управление статистикой сервера, которая отслеживает количество участников и данные о каналах")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Создайте новый канал для отслеживания статистики в определенной категории")
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Тип отслеживаемой статистики")
                        .setRequired(true)
                        .addChoices(
                            { name: "members + bots", value: "members" },
                            { name: "members only", value: "members_only" },
                            { name: "bots only", value: "bots" }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName("channel_type")
                        .setDescription("Тип канала для создания этого трекера")
                        .setRequired(true)
                        .addChoices(
                            { name: "voice channel (recommended)", value: "voice" },
                            { name: "text channel", value: "text" }
                        )
                )
                .addChannelOption(option =>
                    option
                        .setName("category")
                        .setDescription("Категория, в которой будет создан канал для отслеживания статистики")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Список всех трекеров статистики для этого сервера")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("update")
                .setDescription("Обновите существующий трекер статистики")
                .addStringOption(option =>
                    option
                        .setName("counter-id")
                        .setDescription("Идентификатор трекера для обновления")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Новый тип трекера")
                        .setRequired(false)
                        .addChoices(
                            { name: "members + bots", value: "members" },
                            { name: "members only", value: "members_only" },
                            { name: "bots only", value: "bots" }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Удаление существующего трекера статистики")
                .addStringOption(option =>
                    option
                        .setName("counter-id")
                        .setDescription("The ID of the tracker to delete")
                        .setRequired(true)
                )
        ),

    async execute(interaction, guildConfig, client) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case "create":
                    await handleCreate(interaction, client);
                    break;
                case "list":
                    await handleList(interaction, client);
                    break;
                case "update":
                    await handleUpdate(interaction, client);
                    break;
                case "delete":
                    await handleDelete(interaction, client);
                    break;
                default:
                    await InteractionHelper.safeReply(interaction, {
                        embeds: [errorEmbed("Unknown subcommand.")],
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            logger.error(`Error in serverstats ${subcommand}:`, error);
            
            const errorEmbedMsg = createEmbed({ 
                title: "❌ Ошибка", 
                description: "Произошла ошибка при обработке вашего запроса.",
                color: getColor('error')
            });

            if (!interaction.replied && !interaction.deferred) {
                await InteractionHelper.safeReply(interaction, { embeds: [errorEmbedMsg], flags: MessageFlags.Ephemeral }).catch(logger.error);
            } else {
                await interaction.followUp({ embeds: [errorEmbedMsg], flags: MessageFlags.Ephemeral }).catch(logger.error);
            }
        }
    }
};




