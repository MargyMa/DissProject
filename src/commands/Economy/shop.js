import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

import shopBrowse from './modules/shop_browse.js';
import shopConfigSetrole from './modules/shop_config_setrole.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Команды экономичного магазина.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Загляните в магазин эконом-класса.'),
        )
        .addSubcommandGroup(group =>
            group
                .setName('config')
                .setDescription('Настройка параметров магазина. (Требуется управлять сервером)')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setrole')
                        .setDescription('Установите роль Discord, которая будет предоставляться при покупке предмета магазина Премиум Роли.')
                        .addRoleOption(option =>
                            option
                                .setName('role')
                                .setDescription('Роль, которую нужно предоставить для покупки премиум-ролей.')
                                .setRequired(true),
                        ),
                ),
        ),

    async execute(interaction, config, client) {
        try {
            const subcommandGroup = interaction.options.getSubcommandGroup(false);
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'browse') {
                return await shopBrowse.execute(interaction, config, client);
            }

            if (subcommandGroup === 'config' && subcommand === 'setrole') {
                return await shopConfigSetrole.execute(interaction, config, client);
            }

            return InteractionHelper.safeReply(interaction, {
                embeds: [errorEmbed('Ошибка', 'Неизвестная подкоманда.')],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            logger.error('shop command error:', error);
            await InteractionHelper.safeReply(interaction, {
                content: '❌ При выполнении команды shop произошла ошибка.',
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        }
    },
};
