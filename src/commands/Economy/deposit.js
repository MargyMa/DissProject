import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData, getMaxBankCapacity } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { MessageTemplates } from '../../utils/messageTemplates.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Внесите деньги со своего кошелька в свой банк')
        .addStringOption(option =>
            option
                .setName('amount')
                .setDescription('Сумма для внесения депозита (число или "all")')
                .setRequired(true)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
        
        const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const amountInput = interaction.options.getString("amount");

            const userData = await getEconomyData(client, guildId, userId);
            
            if (!userData) {
                throw createError(
                    "Не удалось загрузить экономические данные",
                    ErrorTypes.DATABASE,
                    "Не удалось загрузить ваши экономические данные. Пожалуйста, повторите попытку позже.",
                    { userId, guildId }
                );
            }
            
            const maxBank = getMaxBankCapacity(userData);
            let depositAmount;

            if (amountInput.toLowerCase() === "all") {
                depositAmount = userData.wallet;
            } else {
                depositAmount = parseInt(amountInput);

                if (isNaN(depositAmount) || depositAmount <= 0) {
                    throw createError(
                        "Недействительная сумма депозита",
                        ErrorTypes.VALIDATION,
                        `Пожалуйста, введите действительную сумму или "all". Вы ввели: \`${amountInput}\``,
                        { amountInput, userId }
                    );
                }
            }

            if (depositAmount === 0) {
                throw createError(
                    "Нулевая сумма депозита",
                    ErrorTypes.VALIDATION,
                    "У вас нет наличных для внесения депозита.",
                    { userId, walletBalance: userData.wallet }
                );
            }

            if (depositAmount > userData.wallet) {
                depositAmount = userData.wallet;
                await interaction.followUp({
                    embeds: [
                        MessageTemplates.ERRORS.INVALID_INPUT(
                            "сумма депозита",
                            `Вы пытались внести на счет больше, чем у вас есть. Внесение оставшихся наличных: **$${depositAmount.toLocaleString()}**`
                        )
                    ],
                    flags: ["Ephemeral"],
                });
            }

            const availableSpace = maxBank - userData.bank;

            if (availableSpace <= 0) {
                throw createError(
                    "Банк полон",
                    ErrorTypes.VALIDATION,
                    `В данный момент ваш банк заполнен (Максимальная вместимость: $${maxBank.toLocaleString()}). Приобретите **Улучшение банка** чтобы увеличить свой лимит.`,
                    { maxBank, currentBank: userData.bank, userId }
                );
            }

            if (depositAmount > availableSpace) {
                const originalDepositAmount = depositAmount;
                depositAmount = availableSpace;

                if (amountInput.toLowerCase() !== "all") {
                    await interaction.followUp({
                        embeds: [
                            MessageTemplates.ERRORS.INVALID_INPUT(
                                "сумма депозита",
                                `У тебя было место только для **$${depositAmount.toLocaleString()}** на вашем банковском счете (Максимум: $${maxBank.toLocaleString()}). Остальное остается у вас наличными.`
                            )
                        ],
                        flags: ["Ephemeral"],
                    });
                }
            }

            if (depositAmount === 0) {
                throw createError(
                    "Нет места или наличных для внесения депозита",
                    ErrorTypes.VALIDATION,
                    "Сумма, которую вы пытались внести, была либо равна 0, либо превысила ваши банковские возможности после проверки баланса наличных.",
                    { depositAmount, availableSpace, walletBalance: userData.wallet }
                );
            }

            userData.wallet -= depositAmount;
            userData.bank += depositAmount;

            await setEconomyData(client, guildId, userId, userData);

            const embed = MessageTemplates.SUCCESS.DATA_UPDATED(
                "депозит",
                `Вы успешно внесли депозит **$${depositAmount.toLocaleString()}** в ваш банк.`
            )
                .addFields(
                    {
                        name: "💵 Новая сумма баланса",
                        value: `$${userData.wallet.toLocaleString()}`,
                        inline: true,
                    },
                    {
                        name: "🏦 Новый банковский баланс",
                        value: `$${userData.bank.toLocaleString()} / $${maxBank.toLocaleString()}`,
                        inline: true,
                    },
                );

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'deposit' })
};





