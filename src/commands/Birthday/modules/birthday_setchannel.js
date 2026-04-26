import { PermissionsBitField, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../../services/guildConfig.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [errorEmbed('В разрешении отказано', 'Тебе нужно **Управление сервером** разрешения для настройки канала «День рождения».')],
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            const channel = interaction.options.getChannel('channel');
            const guildId = interaction.guildId;
            const guildConfig = await getGuildConfig(client, guildId);

            if (channel) {
                guildConfig.birthdayChannelId = channel.id;
                await setGuildConfig(client, guildId, guildConfig);
                return InteractionHelper.safeReply(interaction, {
                    embeds: [successEmbed('🎂 Включены объявления о дне рождения', `Объявления о днях рождения теперь будут публиковаться в ${channel}.`)],
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                guildConfig.birthdayChannelId = null;
                await setGuildConfig(client, guildId, guildConfig);
                return InteractionHelper.safeReply(interaction, {
                    embeds: [successEmbed('🎂 Объявления о дне рождения отключены', 'Канал не предоставлен — объявления о днях рождения отключены.')],
                    flags: MessageFlags.Ephemeral,
                });
            }
        } catch (error) {
            logger.error('birthday_setchannel error:', error);
            return InteractionHelper.safeReply(interaction, {
                embeds: [errorEmbed('Configuration Error', 'Could not save the birthday channel configuration.')],
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
