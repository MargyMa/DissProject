import { PermissionsBitField, ChannelType } from 'discord.js';
import { errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../../services/guildConfig.js';
import { logEvent } from '../../../utils/moderation.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return InteractionHelper.safeReply(interaction, {
                embeds: [errorEmbed('В разрешении отказано', 'Тебе нужно **Администратор** разрешения на изменение каналов регистрации.')],
            });
        }

        if (!client.db) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Ошибка в базе данных', 'База данных не инициализирована.')],
            });
        }

        const guildId = interaction.guildId;
        const currentConfig = await getGuildConfig(client, guildId);

        const logChannel = interaction.options.getChannel('channel');
        const disableLogging = interaction.options.getBoolean('disable');

        try {
            if (disableLogging) {
                currentConfig.logChannelId = null;
                currentConfig.enableLogging = false;
                currentConfig.logging = {
                    ...(currentConfig.logging || {}),
                    enabled: false,
                    channelId: null,
                };
                await setGuildConfig(client, guildId, currentConfig);
                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed('Ведение журнала отключено 🚫', 'Ведение журнала аудита на этом сервере отключено.')],
                });
            }

            if (logChannel) {
                const perms = logChannel.permissionsFor(interaction.guild.members.me);
                if (!perms.has(PermissionsBitField.Flags.SendMessages) || !perms.has(PermissionsBitField.Flags.EmbedLinks)) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [errorEmbed('Ошибка в разрешении доступа бота', `Мне нужно **Отправлять сообщения** и **Вставлять ссылки** разрешения в ${logChannel}.`)],
                    });
                }

                currentConfig.logChannelId = logChannel.id;
                currentConfig.enableLogging = true;
                currentConfig.logging = {
                    ...(currentConfig.logging || {}),
                    enabled: true,
                    channelId: logChannel.id,
                };
                await setGuildConfig(client, guildId, currentConfig);

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed('Установленный канал регистрации 📝', `Журналы аудита будут отправлены в ${logChannel}.`)],
                });

                await logEvent({
                    client,
                    guild: interaction.guild,
                    event: {
                        action: 'Активирован канал регистрации',
                        target: logChannel.toString(),
                        executor: `${interaction.user.tag} (${interaction.user.id})`,
                        reason: `Канал ведения журнала, установленный ${interaction.user}`,
                        metadata: { channelId: logChannel.id, moderatorId: interaction.user.id, loggingEnabled: true },
                    },
                });
                return;
            }

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Никакой опции не предусмотрено', 'Обеспечьте один из: `channel` или `disable: True`.\n\n> Транскрипция тикетов и каналы журналов регистрируются через `/ticket setup` или `/ticket dashboard`.')],
            });
        } catch (error) {
            logger.error('logging setchannel error:', error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Configuration Error', 'Could not save the configuration.')],
            });
        }
    },
};
