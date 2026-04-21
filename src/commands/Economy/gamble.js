import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { MessageTemplates } from '../../utils/messageTemplates.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const BASE_WIN_CHANCE = 0.4;
const CLOVER_WIN_BONUS = 0.1;
const CHARM_WIN_BONUS = 0.08;
const PAYOUT_MULTIPLIER = 2.0;
const GAMBLE_COOLDOWN = 5 * 60 * 1000;

export default {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Поставьте на кон свои деньги, чтобы получить шанс выиграть больше')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Сумма, которую можно поставить на кон')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const betAmount = interaction.options.getInteger("amount");
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastGamble = userData.lastGamble || 0;
            let cloverCount = userData.inventory["lucky_clover"] || 0;
            let charmCount = userData.inventory["lucky_charm"] || 0;

            if (now < lastGamble + GAMBLE_COOLDOWN) {
                const remaining = lastGamble + GAMBLE_COOLDOWN - now;
                const minutes = Math.floor(remaining / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                throw createError(
                    "Время восстановления ставки активно",
                    ErrorTypes.RATE_LIMIT,
                    `Тебе нужно остыть, прежде чем снова играть. Подожди **${minutes}m ${seconds}s**.`,
                    { remaining, cooldownType: 'gamble' }
                );
            }

            if (userData.wallet < betAmount) {
                throw createError(
                    "Недостаточно денег для азартных игр",
                    ErrorTypes.VALIDATION,
                    `У вас есть только $${userData.wallet.toLocaleString()} наличными, но вы пытаетесь сделать ставку $${betAmount.toLocaleString()}.`,
                    { required: betAmount, current: userData.wallet }
                );
            }

            let winChance = BASE_WIN_CHANCE;
            let cloverMessage = "";
            let usedClover = false;
            let usedCharm = false;

            
            if (cloverCount > 0) {
                winChance += CLOVER_WIN_BONUS;
                userData.inventory["lucky_clover"] -= 1;
                cloverMessage = `\n🍀 **Счастливый Клевер съеден:** Ваши шансы на победу были увеличены!`;
                usedClover = true;
            }
            
            else if (charmCount > 0) {
                winChance += CHARM_WIN_BONUS;
                userData.inventory["lucky_charm"] -= 1;
                cloverMessage = `\n🍀 **Используемый талисман на удачу (${charmCount - 1} uses remaining):** Ваши шансы на победу были увеличены!`;
                usedCharm = true;
            }

            const win = Math.random() < winChance;
            let cashChange = 0;
            let resultEmbed;

            if (win) {
                const amountWon = Math.floor(betAmount * PAYOUT_MULTIPLIER);
cashChange = amountWon;

                resultEmbed = successEmbed(
                    "🎉 Ты победил!",
                    `Вы успешно сыграли и выиграли **$${betAmount.toLocaleString()}** делайте ставки в **$${amountWon.toLocaleString()}**!${cloverMessage}`,
                );
            } else {
cashChange = -betAmount;

                resultEmbed = errorEmbed(
                    "💔 Ты проиграл...",
                    `Кости легли не в твою пользу. Ты проиграл **$${betAmount.toLocaleString()}** ставка.`,
                );
            }

            userData.wallet = (userData.wallet || 0) + cashChange;
userData.lastGamble = now;

            await setEconomyData(client, guildId, userId, userData);

            const newCash = userData.wallet;

            resultEmbed.addFields({
                name: "💵 Новый денежный баланс",
                value: `$${newCash.toLocaleString()}`,
                inline: true,
            });

            if (usedClover) {
                resultEmbed.setFooter({
                    text: `У тебя есть ${userData.inventory["lucky_clover"]} Счастливый клевер. Шанс на победу был ${Math.round(winChance * 100)}%.`,
                });
            } else if (usedCharm) {
                resultEmbed.setFooter({
                    text: `У тебя есть ${userData.inventory["lucky_charm"]} Счастливый талисман использует. Шанс на победу был ${Math.round(winChance * 100)}%.`,
                });
            } else {
                resultEmbed.setFooter({
                    text: `Следующая ставка доступна через 5 минут. Базовый шанс на выигрыш: ${Math.round(BASE_WIN_CHANCE * 100)}%.`,
                });
            }

            await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'gamble' })
};




