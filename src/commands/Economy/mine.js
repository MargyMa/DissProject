import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { MessageTemplates } from '../../utils/messageTemplates.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const MINE_COOLDOWN = 60 * 60 * 1000;
const BASE_MIN_REWARD = 400;
const BASE_MAX_REWARD = 1200;
const PICKAXE_MULTIPLIER = 1.2;
const DIAMOND_PICKAXE_MULTIPLIER = 2.0;

const MINE_LOCATIONS = [
    "Заброшенный золотой рудник",
    "Темная, сырая пещера",
    "Каменный карьер на заднем дворе",
    "Жерло вулкана из обсидиана",
    "Глубоководный минеральный желоб",
];

export default {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Занимайтесь копанием, чтобы зарабатывать деньги'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastMine = userData.lastMine || 0;
            const hasDiamondPickaxe = userData.inventory["diamond_pickaxe"] || 0;
            const hasPickaxe = userData.inventory["pickaxe"] || 0;

            if (now < lastMine + MINE_COOLDOWN) {
                const remaining = lastMine + MINE_COOLDOWN - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor(
                    (remaining % (1000 * 60 * 60)) / (1000 * 60),
                );

                throw createError(
                    "Время восстановления копания активно",
                    ErrorTypes.RATE_LIMIT,
                    `Ваша кирка остывает. Подождите **${hours}h ${minutes}m** перед повторной добычей полезных ископаемых.`,
                    { remaining, cooldownType: 'mine' }
                );
            }

            const baseEarned =
                Math.floor(
                    Math.random() * (BASE_MAX_REWARD - BASE_MIN_REWARD + 1),
                ) + BASE_MIN_REWARD;

            let finalEarned = baseEarned;
            let multiplierMessage = "";

            if (hasDiamondPickaxe > 0) {
                finalEarned = Math.floor(baseEarned * DIAMOND_PICKAXE_MULTIPLIER);
                multiplierMessage = `\n💎 **Бонус за алмазную кирку: +100%**`;
            } else if (hasPickaxe > 0) {
                finalEarned = Math.floor(baseEarned * PICKAXE_MULTIPLIER);
                multiplierMessage = `\n⛏️ **Бонус за использование кирки: +20%**`;
            }

            const location =
                MINE_LOCATIONS[
                    Math.floor(Math.random() * MINE_LOCATIONS.length)
                ];

            userData.wallet += finalEarned;
userData.lastMine = now;

            await setEconomyData(client, guildId, userId, userData);

            const embed = successEmbed(
                "💰 Экспедиция по добыче полезных ископаемых прошла успешно!",
                `Вы исследовали целый **${location}** и сумели найти полезные ископаемые **$${finalEarned.toLocaleString()}**!${multiplierMessage}`,
            )
                .addFields({
                    name: "💵 Новый денежный баланс",
                    value: `$${userData.wallet.toLocaleString()}`,
                    inline: true,
                })
                .setFooter({ text: `Следующая шахта будет доступна через 1 час.` });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'mine' })
};




