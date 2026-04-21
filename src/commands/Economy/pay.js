import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, addMoney, removeMoney, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { MessageTemplates } from '../../utils/messageTemplates.js';
import EconomyService from '../../services/economyService.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Переведите другому пользователю часть своих денег')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Пользователь должен оплатить')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Сумма к оплате')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const senderId = interaction.user.id;
            const receiver = interaction.options.getUser("user");
            const amount = interaction.options.getInteger("amount");
            const guildId = interaction.guildId;

            logger.debug(`[ECONOMY] Pay command initiated`, { 
                senderId, 
                receiverId: receiver.id,
                amount,
                guildId
            });

            if (receiver.bot) {
                throw createError(
                    "Не могу оплатить боту",
                    ErrorTypes.VALIDATION,
                    "Вы не можете заплатить боту.",
                    { receiverId: receiver.id, isBot: true }
                );
            }
            
            if (receiver.id === senderId) {
                throw createError(
                    "Не могу расплатиться себе",
                    ErrorTypes.VALIDATION,
                    "Вы не можете заплатить сами себе.",
                    { senderId, receiverId: receiver.id }
                );
            }
            
            if (amount <= 0) {
                throw createError(
                    "Недействительная сумма платежа",
                    ErrorTypes.VALIDATION,
                    "Сумма должна быть больше нуля.",
                    { amount, senderId }
                );
            }

            const [senderData, receiverData] = await Promise.all([
                getEconomyData(client, guildId, senderId),
                getEconomyData(client, guildId, receiver.id)
            ]);

            if (!senderData) {
                throw createError(
                    "Не удалось загрузить данные об экономике отправителя",
                    ErrorTypes.DATABASE,
                    "Не удалось загрузить данные о вашей экономике. Пожалуйста, повторите попытку позже.",
                    { userId: senderId, guildId }
                );
            }
            
            if (!receiverData) {
                throw createError(
                    "Не удалось загрузить данные о состоянии экономики",
                    ErrorTypes.DATABASE,
                    "Не удалось загрузить данные об экономике получателя. Пожалуйста, повторите попытку позже.",
                    { userId: receiver.id, guildId }
                );
            }

            
            
            const result = await EconomyService.transferMoney(
                client, 
                guildId, 
                senderId, 
                receiver.id, 
                amount
            );

            
            const updatedSenderData = await getEconomyData(client, guildId, senderId);
            const updatedReceiverData = await getEconomyData(client, guildId, receiver.id);

            const embed = MessageTemplates.SUCCESS.DATA_UPDATED(
                "payment",
                `Вы успешно оплатили **${receiver.username}** количество **$${amount.toLocaleString()}**!`
            )
                .addFields(
                    {
                        name: "💳 Сумма платежа",
                        value: `$${amount.toLocaleString()}`,
                        inline: true,
                    },
                    {
                        name: "💵 Ваш новый баланс",
                        value: `$${updatedSenderData.wallet.toLocaleString()}`,
                        inline: true,
                    },
                )
                .setFooter({
                    text: `Paid to ${receiver.tag}`,
                    iconURL: receiver.displayAvatarURL(),
                });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });

            logger.info(`[ECONOMY] Payment sent successfully`, {
                senderId,
                receiverId: receiver.id,
                amount,
                senderBalance: updatedSenderData.wallet,
                receiverBalance: updatedReceiverData.wallet
            });

            try {
                const receiverEmbed = createEmbed({ 
                    title: "💰 Входящий платеж!", 
                    description: `${interaction.user.username} заплатил тебе **$${amount.toLocaleString()}**.` 
                }).addFields({
                    name: "Ваш новый баланс",
                    value: `$${updatedReceiverData.wallet.toLocaleString()}`,
                    inline: true,
                });
                await receiver.send({ embeds: [receiverEmbed] });
            } catch (e) {
                    logger.warn(`Could not DM user ${receiver.id}: ${e.message}`);
            }
    }, { command: 'pay' })
};





