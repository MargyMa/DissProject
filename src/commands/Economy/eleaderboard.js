import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("eleaderboard")
        .setDescription("Просмотрите топ-10 самых богатых пользователей сервера.")
        .setDMPermission(false),
    
    
    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

            const guildId = interaction.guildId;

            logger.debug(`[ECONOMY] Запрошена таблица лидеров`, { guildId });

            const prefix = `economy:${guildId}:`;

            let allKeys = await client.db.list(prefix);

            if (!Array.isArray(allKeys)) {
                allKeys = [];
            }

            if (allKeys.length === 0) {
                throw createError(
                    "Данные по экономике не найдены",
                    ErrorTypes.VALIDATION,
                    "Для этого сервера не найдено никаких экономических данных."
                );
            }

            let allUserData = [];

            for (const key of allKeys) {
                const userId = key.replace(prefix, "");
                const userData = await client.db.get(key);

                if (userData) {
                    allUserData.push({
                        userId: userId,
                        net_worth: (userData.wallet || 0) + (userData.bank || 0),
                    });
                }
            }

            allUserData.sort((a, b) => b.net_worth - a.net_worth);

            const topUsers = allUserData.slice(0, 10);
            const userRank =
                allUserData.findIndex((u) => u.userId === interaction.user.id) +
                1;
            const rankEmoji = ["🥇", "🥈", "🥉"];
            const leaderboardEntries = [];

            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const rank = i + 1;
                const emoji = rankEmoji[i] || `**#${rank}**`;

                leaderboardEntries.push(
                    `${emoji} <@${user.userId}> - 🏦 ${user.net_worth.toLocaleString()}`,
                );
            }

            logger.info(`[ECONOMY] Leaderboard generated`, { 
                guildId, 
                userCount: allUserData.length,
                userRank 
            });

            const description = leaderboardEntries.length > 0
                ? leaderboardEntries.join("\n")
                : "Для этого сервера пока не доступны данные об экономии.";

            const embed = createEmbed({
                title: `Таблица лидеров по экономике`,
                description,
                footer: `Ваш ранг: ${userRank > 0 ? `#${userRank}` : "Данные о ранге отсутствуют"}`,
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'eleaderboard' })
};





