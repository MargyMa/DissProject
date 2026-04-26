import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getColor } from '../../config/bot.js';
import { getGuildConfig } from '../../services/guildConfig.js';
import { getLoggingStatus } from '../../services/loggingService.js';
import { getLevelingConfig } from '../../services/leveling.js';
import { getConfiguration as getJoinToCreateConfiguration } from '../../services/joinToCreateService.js';
import { getWelcomeConfig, getApplicationSettings } from '../../utils/database.js';
import { errorEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

function pill(enabled) {
    return enabled ? '✅ Включён' : '❌ Выключен';
}

async function formatChannelMention(guild, id) {
    if (!id) return '`Не настроен`';
    const channel = guild.channels.cache.get(id) ?? await guild.channels.fetch(id).catch(() => null);
    return channel ? channel.toString() : `⚠️ Missing (${id})`;
}

function formatRoleMention(guild, id) {
    if (!id) return '`Не настроен`';
    const role = guild.roles.cache.get(id);
    return role ? role.toString() : `⚠️ Missing (${id})`;
}

export default {
    data: new SlashCommandBuilder()
        .setName('overview')
        .setDescription('Снимок состояния всех систем сервера, доступный только для чтения.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction, config, client) {
        try {
            await InteractionHelper.safeDefer(interaction);

            const [guildConfig, loggingStatus, levelingConfig, welcomeConfig, applicationConfig, joinToCreateConfig] =
                await Promise.all([
                    getGuildConfig(client, interaction.guildId),
                    getLoggingStatus(client, interaction.guildId),
                    getLevelingConfig(client, interaction.guildId),
                    getWelcomeConfig(client, interaction.guildId),
                    getApplicationSettings(client, interaction.guildId),
                    getJoinToCreateConfiguration(client, interaction.guildId),
                ]);

            const verificationEnabled = Boolean(guildConfig.verification?.enabled);
            const autoVerifyEnabled = Boolean(guildConfig.verification?.autoVerify?.enabled);
            const autoRoleId = guildConfig.autoRole || welcomeConfig?.roleIds?.[0];

            // ── Channels ──────────────────────────────────────────────────────
            const [auditChannel, lifecycleChannel, transcriptChannel, reportChannel, birthdayChannel] =
                await Promise.all([
                    formatChannelMention(interaction.guild, loggingStatus.channelId || guildConfig.logging?.channelId || guildConfig.logChannelId),
                    formatChannelMention(interaction.guild, guildConfig.ticketLogsChannelId),
                    formatChannelMention(interaction.guild, guildConfig.ticketTranscriptChannelId),
                    formatChannelMention(interaction.guild, guildConfig.reportChannelId),
                    formatChannelMention(interaction.guild, guildConfig.birthdayChannelId),
                ]);

            const embed = new EmbedBuilder()
                .setTitle('🖥️ Обзор системы')
                .setDescription(`Моментальный снимок только для чтения для **${interaction.guild.name}**. Для внесения изменений используйте панель управления соответствующей команды.`)
                .setColor(getColor('primary'))
                .addFields(
                    // ── Core systems ──
                    {
                        name: '⚙️ Основные системы',
                        value: [
                            `🧾 **Ведение журнала аудита** — ${pill(Boolean(loggingStatus.enabled))}`,
                            `📈 **Уровни** — ${pill(Boolean(levelingConfig?.enabled))}`,
                            `👋 **Добро пожаловать** — ${pill(Boolean(welcomeConfig?.enabled))}`,
                            `👋 **До свидания** — ${pill(Boolean(welcomeConfig?.goodbyeEnabled))}`,
                            `🎂 **Дни рождения** — ${pill(Boolean(guildConfig.birthdayChannelId))}`,
                            `📋 **Приложения** — ${pill(Boolean(applicationConfig?.enabled))}`,
                            `✅ **Верификация** — ${pill(verificationEnabled)}`,
                            `🤖 **Автоматическая верификация** — ${pill(autoVerifyEnabled)}`,
                            `🎧 **Присоединяйтесь, чтобы создать** — ${pill(Boolean(joinToCreateConfig?.enabled))}`,
                            `🛡️ **Автоматическая роль** — ${autoRoleId ? `✅ ${formatRoleMention(interaction.guild, autoRoleId)}` : '❌ Off'}`,
                        ].join('\n'),
                        inline: false,
                    },
                    // ── Channels ──
                    {
                        name: '📡 Настроенные каналы',
                        value: [
                            `**Журнал аудита:** ${auditChannel}`,
                            `**Жизненный цикл тикитов:** ${lifecycleChannel}`,
                            `**Расшифровки тикетов:** ${transcriptChannel}`,
                            `**Репорты:** ${reportChannel}`,
                            `**Дни рождения:** ${birthdayChannel}`,
                        ].join('\n'),
                        inline: false,
                    },
                    // ── Refresh stamp ──
                    {
                        name: '🕒 Сделан моментальный снимок',
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: true,
                    },
                )
                .setFooter({ text: 'Запуск только для чтения /logging dashboard для управления параметрами аудита' })
                .setTimestamp();

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        } catch (error) {
            logger.error('overview command error:', error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Overview Error', 'Failed to load the system overview.')],
            });
        }
    },
};
