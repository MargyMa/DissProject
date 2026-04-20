import { PermissionsBitField } from 'discord.js';
import { errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../../services/guildConfig.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [errorEmbed('В разрешении отказано', 'Вам нужны разрешения **На управление сервером**, чтобы установить премиум-роль.')],
                ephemeral: true,
            });
        }

        const role = interaction.options.getRole('role');
        const guildId = interaction.guildId;

        try {
            const currentConfig = await getGuildConfig(client, guildId);
            currentConfig.premiumRoleId = role.id;
            await setGuildConfig(client, guildId, currentConfig);

            return InteractionHelper.safeReply(interaction, {
                embeds: [successEmbed('✅ Набор ролей Премиум Ролей', `Для роли **Магазина Премиум Роли** было установлено значение ${role.toString()}. Участники, которые приобретут Премиум-роль, получат эту роль.`)],
                ephemeral: true,
            });
        } catch (error) {
            logger.error('shop_config_setrole error:', error);
            return InteractionHelper.safeReply(interaction, {
                embeds: [errorEmbed('Системная ошибка', 'Не удалось сохранить конфигурацию гильдии.')],
                ephemeral: true,
            });
        }
    },
};
