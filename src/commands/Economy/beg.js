import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { MessageTemplates } from '../../utils/messageTemplates.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = 30 * 60 * 1000;
const MIN_WIN = 50;
const MAX_WIN = 200;
const SUCCESS_CHANCE = 0.7;

export default {
    data: new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Выпрашивает небольшую сумму денег'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;

            let userData = await getEconomyData(client, guildId, userId);
            
            if (!userData) {
                throw createError(
                    "Не удалось загрузить экономические данные",
                    ErrorTypes.DATABASE,
                    "Не удалось загрузить ваши экономические данные. Пожалуйста, повторите попытку позже.",
                    { userId, guildId }
                );
            }

            const lastBeg = userData.lastBeg || 0;
            const remainingTime = lastBeg + COOLDOWN - Date.now();

            if (remainingTime > 0) {
                const minutes = Math.floor(remainingTime / 60000);
                const seconds = Math.floor((remainingTime % 60000) / 1000);

                let timeMessage =
                    minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

                throw createError(
                    "Время восстановления Beg активно",
                    ErrorTypes.RATE_LIMIT,
                    `Вы устали просить милостыню! Попробуйте еще раз в **${timeMessage}**.`,
                    { remainingTime, minutes, seconds, cooldownType: 'beg' }
                );
            }

            const success = Math.random() < SUCCESS_CHANCE;

            let replyEmbed;
            let newCash = userData.wallet;

            if (success) {
                const amountWon =
                    Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;

                newCash += amountWon;

                const successMessages = [
                    `Добрый незнакомец роняет **$${amountWon.toLocaleString()}** в твою чашку.`,
                    `Вы заметили оставленный без присмотра бумажник! Вы хватаете **$${amountWon.toLocaleString()}** и убегайте.`,
                    `Кто-то сжалился над тобой и дал тебе **$${amountWon.toLocaleString()}**!`,
                    `Вы нашли **$${amountWon.toLocaleString()}** под скамейкой в парке.`,
                ];

                replyEmbed = MessageTemplates.SUCCESS.DATA_UPDATED(
                    "begging",
                    successMessages[
                        Math.floor(Math.random() * successMessages.length)
                    ]
                );
            } else {
                const failMessages = [
                    "Полиция прогнала вас. У вас ничего нет.",
                    "Кто-то крикнул: `Найди работу!` - и прошел мимо.",
                    "Белка украла единственную монету, которая у тебя была.",
                    "Ты пытался умолять, но был слишком смущен и сдался.",
                ];

                replyEmbed = MessageTemplates.ERRORS.INSUFFICIENT_FUNDS(
                    "ничего",
                    "Тебе не удалось заработать денег на попрошайничестве."
                );
                replyEmbed.data.description = failMessages[Math.floor(Math.random() * failMessages.length)];
            }

            userData.wallet = newCash;
userData.lastBeg = Date.now();

            await setEconomyData(client, guildId, userId, userData);

            await InteractionHelper.safeEditReply(interaction, { embeds: [replyEmbed] });
    }, { command: 'beg' })
};


