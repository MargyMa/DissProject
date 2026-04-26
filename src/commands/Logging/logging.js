import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

import dashboard from './modules/logging_dashboard.js';
import setchannel from './modules/logging_setchannel.js';
import filter from './modules/logging_filter.js';

export default {
    data: new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Управление ведением журналов аудита для этого сервера.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('dashboard')
                .setDescription('Откройте интерактивную панель управления логированием — просмотрите статус и переключайте категории событий.'),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('setchannel')
                .setDescription('Настройте канал журнала аудита для этого сервера.')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('Текстовый канал для журналов аудита.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false),
                )
                .addBooleanOption((option) =>
                    option
                        .setName('disable')
                        .setDescription('Установите значение True, чтобы полностью отключить ведение журнала аудита.')
                        .setRequired(false),
                ),
        )
        .addSubcommandGroup((group) =>
            group
                .setName('filter')
                .setDescription('Управление списком игнорирования журнала (пользователи и каналы, которые следует пропустить).')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('add')
                        .setDescription('Добавьте пользователя или канал в список игнорируемых в журнале.')
                        .addStringOption((option) =>
                            option
                                .setName('type')
                                .setDescription('Стоит ли игнорировать пользователя или канал.')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Пользователь', value: 'user' },
                                    { name: 'Канал', value: 'channel' },
                                ),
                        )
                        .addStringOption((option) =>
                            option
                                .setName('id')
                                .setDescription('Идентификатор пользователя или канала, который нужно игнорировать.')
                                .setRequired(true),
                        ),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('remove')
                        .setDescription('Удалите пользователя или канал из списка игнорируемых в журнале.')
                        .addStringOption((option) =>
                            option
                                .setName('type')
                                .setDescription('Будь то пользователь или канал.')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Пользователь', value: 'user' },
                                    { name: 'Канал', value: 'channel' },
                                ),
                        )
                        .addStringOption((option) =>
                            option
                                .setName('id')
                                .setDescription('Идентификатор пользователя или канала, который нужно удалить из списка игнорируемых.')
                                .setRequired(true),
                        ),
                ),
        ),

    async execute(interaction, config, client) {
        try {
            // setchannel and filter both need a reply deferred before their logic runs
            const subcommandGroup = interaction.options.getSubcommandGroup(false);
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'dashboard') {
                return await dashboard.execute(interaction, config, client);
            }

            await InteractionHelper.safeDefer(interaction);

            if (subcommand === 'setchannel') {
                return await setchannel.execute(interaction, config, client);
            }

            if (subcommandGroup === 'filter') {
                return await filter.execute(interaction, config, client);
            }

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Неизвестная подкоманда', 'Эта подкоманда не распознается.')],
            });
        } catch (error) {
            logger.error('logging command error:', error);
            await InteractionHelper.safeReply(interaction, {
                embeds: [errorEmbed('Error', 'An unexpected error occurred.')],
                ephemeral: true,
            }).catch(() => {});
        }
    },
};
