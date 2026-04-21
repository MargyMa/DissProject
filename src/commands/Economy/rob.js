import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { MessageTemplates } from '../../utils/messageTemplates.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const ROB_COOLDOWN = 4 * 60 * 60 * 1000;
const BASE_ROB_SUCCESS_CHANCE = 0.25;
const ROB_PERCENTAGE = 0.15;
const FINE_PERCENTAGE = 0.1;

export default {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Попытка ограбить другого пользователя (очень рискованно)')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Пользователя ограбить')
                .setRequired(true)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const robberId = interaction.user.id;
            const victimUser = interaction.options.getUser("user");
            const guildId = interaction.guildId;
            const now = Date.now();

            if (robberId === victimUser.id) {
                throw createError(
                    "Я не могу ограбить себя",
                    ErrorTypes.VALIDATION,
                    "Ты не можешь ограбить самого себя.",
                    { robberId, victimId: victimUser.id }
                );
            }
            
            if (victimUser.bot) {
                throw createError(
                    "Невозможно ограбить бота",
                    ErrorTypes.VALIDATION,
                    "Вы не можете ограбить бота.",
                    { victimId: victimUser.id, isBot: true }
                );
            }

            const robberData = await getEconomyData(client, guildId, robberId);
            const victimData = await getEconomyData(client, guildId, victimUser.id);
            
            if (!robberData || !victimData) {
                throw createError(
                    "Не удалось загрузить экономические данные",
                    ErrorTypes.DATABASE,
                    "Не удалось загрузить данные об экономике. Пожалуйста, повторите попытку позже.",
                    { robberId: !!robberData, victimId: !!victimData, guildId }
                );
            }
            
            const lastRob = robberData.lastRob || 0;

            if (now < lastRob + ROB_COOLDOWN) {
                const remaining = lastRob + ROB_COOLDOWN - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

                throw createError(
                    "Время восстановления после ограбления активно",
                    ErrorTypes.RATE_LIMIT,
                    `Тебе нужно залечь на дно. Подожди **${hours}h ${minutes}m** перед попыткой очередного ограбления.`,
                    { remaining, hours, minutes, cooldownType: 'rob' }
                );
            }

            if (victimData.wallet < 500) {
                throw createError(
                    "Жертва слишком бедна",
                    ErrorTypes.VALIDATION,
                    `${victimUser.username} Он слишком беден. Чтобы его стоило грабить, у него должно быть не меньше $500 наличными.`,
                    { victimWallet: victimData.wallet, required: 500 }
                );
            }

            const hasSafe = victimData.inventory["personal_safe"] || 0;

            if (hasSafe > 0) {
                robberData.lastRob = now;
                await setEconomyData(client, guildId, robberId, robberData);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        MessageTemplates.ERRORS.CONFIGURATION_REQUIRED(
                            "robbery protection",
                            `${victimUser.username} Вы подготовились! Ваша попытка провалилась, потому что у них есть **личный сейф**. Вы остались в выигрыше, но ничего не получили.`
                        )
                    ],
                });
            }

            const isSuccessful = Math.random() < BASE_ROB_SUCCESS_CHANCE;
            let resultEmbed;

            if (isSuccessful) {
                const amountStolen = Math.floor(victimData.wallet * ROB_PERCENTAGE);

                robberData.wallet = (robberData.wallet || 0) + amountStolen;
                victimData.wallet = (victimData.wallet || 0) - amountStolen;

                resultEmbed = MessageTemplates.SUCCESS.DATA_UPDATED(
                    "robbery",
                    `Вы успешно украли **$${amountStolen.toLocaleString()}** у ${victimUser.username}!`
                );
            } else {
                const fineAmount = Math.floor((robberData.wallet || 0) * FINE_PERCENTAGE);

                if ((robberData.wallet || 0) < fineAmount) {
                    robberData.wallet = 0;
                } else {
                    robberData.wallet = (robberData.wallet || 0) - fineAmount;
                }

                resultEmbed = MessageTemplates.ERRORS.INSUFFICIENT_PERMISSIONS(
                    "robbery failed",
                    `Вы провалили ограбление и были пойманы! Вас оштрафовали **$${fineAmount.toLocaleString()}** из ваших собственных наличных денег.`
                );
            }

            robberData.lastRob = now;

            await setEconomyData(client, guildId, robberId, robberData);
            await setEconomyData(client, guildId, victimUser.id, victimData);

            resultEmbed
                .addFields(
                    {
                        name: `Ваш новый баланс (${interaction.user.username})`,
                        value: `$${robberData.wallet.toLocaleString()}`,
                        inline: true,
                    },
                    {
                        name: `Новые деньги жертвы (${victimUser.username})`,
                        value: `$${victimData.wallet.toLocaleString()}`,
                        inline: true,
                    },
                )
                .setFooter({ text: `Следующее ограбление состоится через 4 часа.` });

            await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'rob' })
};



