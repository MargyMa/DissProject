import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const SLUT_COOLDOWN = 45 * 60 * 1000;

const SLUT_ACTIVITIES = [
    { name: "Стрим с камерой", min: 120, max: 450, risk: 0.2 },
    { name: "Сеанс приватного танца", min: 220, max: 700, risk: 0.25 },
    { name: "Ведущий клуба в нерабочее время", min: 320, max: 900, risk: 0.3 },
    { name: "Бронирование VIP-спутника", min: 550, max: 1400, risk: 0.35 },
    { name: "Эксклюзивная прямая трансляция", min: 850, max: 2200, risk: 0.4 },
];

const POSITIVE_OUTCOMES = [
    "Ваш стрим набрал популярность, и посыпались чаевые.",
    "VIP-бронирование обошлось намного дороже обычного.",
    "Ваша ночная смена прошла успешно и принесла прибыль.",
    "Пришли запросы на премиум-подписку, и ваша выплата увеличилась.",
];

const FINE_OUTCOMES = [
    "Служба безопасности объекта выписала штраф за несоблюдение требований.",
    "Забастовка модераторов привела к введению платы за использование платформы.",
    "Вас побили, и вам пришлось заплатить штраф.",
];

const ROBBED_OUTCOMES = [
    "Фальшивый покупатель вернул вам часть денег.",
    "Из-за мошенников вы потеряли часть своих денег.",
    "Вы попались на удочку мошенников и потеряли деньги.",
];

const LOSS_OUTCOMES = [
    "Сериал провалился, и вам пришлось покрывать операционные расходы.",
    "Вы потратили бюджет на подготовку и ничего не получили взамен.",
    "Сдвиг произошел в сторону ухудшения, и вы оказались в минусе.",
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function resolveOutcome(activity, wallet) {
    const successChance = Math.max(0.35, 0.55 - activity.risk * 0.2);
    const fineChance = 0.22;
    const robbedChance = 0.2;
    const roll = Math.random();

    if (roll < successChance) {
        const amount = randomInt(activity.min, activity.max);
        return {
            type: 'payout',
            delta: amount,
            message: randomChoice(POSITIVE_OUTCOMES),
            title: `💰 ${activity.name} - Выплата`
        };
    }

    const remainingAfterSuccess = roll - successChance;

    if (remainingAfterSuccess < fineChance) {
        const maxFine = Math.min(wallet, Math.max(150, Math.floor(activity.max * 0.4)));
        const minFine = Math.min(maxFine, Math.max(50, Math.floor(activity.min * 0.2)));
        const amount = maxFine > 0 ? randomInt(minFine, maxFine) : 0;
        return {
            type: 'fine',
            delta: -amount,
            message: randomChoice(FINE_OUTCOMES),
            title: `🚨 ${activity.name} - Оштрафованный`
        };
    }

    if (remainingAfterSuccess < fineChance + robbedChance) {
        const maxRobbed = Math.min(wallet, Math.max(200, Math.floor(wallet * 0.35)));
        const minRobbed = Math.min(maxRobbed, Math.max(75, Math.floor(wallet * 0.1)));
        const amount = maxRobbed > 0 ? randomInt(minRobbed, maxRobbed) : 0;
        return {
            type: 'robbed',
            delta: -amount,
            message: randomChoice(ROBBED_OUTCOMES),
            title: `🕵️ ${activity.name} - Ограбленный`
        };
    }

    const maxLoss = Math.min(wallet, Math.max(100, Math.floor(activity.max * 0.3)));
    const minLoss = Math.min(maxLoss, Math.max(40, Math.floor(activity.min * 0.15)));
    const amount = maxLoss > 0 ? randomInt(minLoss, maxLoss) : 0;
    return {
        type: 'loss',
        delta: -amount,
        message: randomChoice(LOSS_OUTCOMES),
        title: `❌ ${activity.name} - Потеря`
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName('slut')
        .setDescription('Согласитесь на рискованную провокационную работу ради случайной выплаты или проигрыша'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            logger.debug(`[ECONOMY] Slut command started for ${userId}`, { userId, guildId });

            const userData = await getEconomyData(client, guildId, userId);

            if (!userData) {
                throw createError(
                    "Не удалось загрузить экономические данные для команды slut",
                    ErrorTypes.DATABASE,
                    "Не удалось загрузить данные о вашей экономике. Пожалуйста, повторите попытку позже.",
                    { userId, guildId }
                );
            }

            const lastSlut = userData.lastSlut || 0;

            if (now - lastSlut < SLUT_COOLDOWN) {
                const remainingTime = lastSlut + SLUT_COOLDOWN - now;
                throw createError(
                    "Активный кулдаун slut",
                    ErrorTypes.RATE_LIMIT,
                    `Вам нужно подождать, прежде чем вы снова сможете работать! Попробуйте еще раз **${Math.ceil(remainingTime / 60000)}** минут.`,
                    { timeRemaining: remainingTime, cooldownType: 'slut' }
                );
            }

            const activity = randomChoice(SLUT_ACTIVITIES);

            const outcome = resolveOutcome(activity, userData.wallet || 0);

            userData.lastSlut = now;
            userData.totalSluts = (userData.totalSluts || 0) + 1;
            userData.totalSlutEarnings = (userData.totalSlutEarnings || 0) + Math.max(0, outcome.delta);
            userData.totalSlutLosses = (userData.totalSlutLosses || 0) + Math.max(0, -outcome.delta);

            if (outcome.type !== 'payout') {
                userData.failedSluts = (userData.failedSluts || 0) + 1;
            }

            userData.wallet = Math.max(0, (userData.wallet || 0) + outcome.delta);

            await setEconomyData(client, guildId, userId, userData);

            logger.info(`[ECONOMY_TRANSACTION] Slut activity resolved`, {
                userId,
                guildId,
                activity: activity.name,
                outcomeType: outcome.type,
                amountDelta: outcome.delta,
                newWallet: userData.wallet,
                timestamp: new Date().toISOString()
            });

            const amountLabel = `${outcome.delta >= 0 ? '+' : '-'}$${Math.abs(outcome.delta).toLocaleString()}`;
            const summaryLines = [
                `${outcome.message}`,
                `💸 **Чистый результат:** ${amountLabel}`,
                `💳 **Текущий баланс:** $${userData.wallet.toLocaleString()}`,
                `📊 **Общее количество сеансов:** ${userData.totalSluts}`,
                `💵 **Общая сумма заработанных средств:** $${(userData.totalSlutEarnings || 0).toLocaleString()}`,
                `🧾 **Всего потеряно:** $${(userData.totalSlutLosses || 0).toLocaleString()}`
            ];

            const embed = createEmbed({
                title: outcome.title,
                description: summaryLines.join('\n'),
                color: outcome.delta >= 0 ? 'success' : 'error',
                timestamp: true
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'slut' })
};





