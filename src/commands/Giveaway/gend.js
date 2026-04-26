import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes, handleInteractionError } from '../../utils/errorHandler.js';
import { getGuildGiveaways, saveGiveaway } from '../../utils/giveaways.js';
import { 
    endGiveaway as endGiveawayService,
    createGiveawayEmbed, 
    createGiveawayButtons 
} from '../../services/giveawayService.js';
import { logEvent, EVENT_TYPES } from '../../services/loggingService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("gend")
        .setDescription(
            "Немедленно завершает активную раздачу и выбирает победителя.",
        )
        .addStringOption((option) =>
            option
                .setName("messageid")
                .setDescription("Идентификатор сообщения о завершении розыгрыша.")
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            
            if (!interaction.inGuild()) {
                throw new TitanBotError(
                    'Команда Giveaway использовалась вне гильдии',
                    ErrorTypes.VALIDATION,
                    'Эту команду можно использовать только на сервере.',
                    { userId: interaction.user.id }
                );
            }

            
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                throw new TitanBotError(
                    'У пользователя нет разрешения на создание ManageGuild',
                    ErrorTypes.PERMISSION,
                    "Чтобы завершить розыгрыш, вам потребуется разрешение «Управление сервером».",
                    { userId: interaction.user.id, guildId: interaction.guildId }
                );
            }

            logger.info(`Giveaway end initiated by ${interaction.user.tag} in guild ${interaction.guildId}`);

            const messageId = interaction.options.getString("messageid");

            
            if (!messageId || !/^\d+$/.test(messageId)) {
                throw new TitanBotError(
                    'Неверный формат идентификатора сообщения',
                    ErrorTypes.VALIDATION,
                    'Пожалуйста, укажите действительный идентификатор сообщения.',
                    { providedId: messageId }
                );
            }

            const giveaways = await getGuildGiveaways(interaction.client, interaction.guildId);
            const giveaway = giveaways.find(g => g.messageId === messageId);

            if (!giveaway) {
                throw new TitanBotError(
                    `Раздача не найдено: ${messageId}`,
                    ErrorTypes.VALIDATION,
                    "В базе данных не найдено ни одного розыгрыша с таким идентификатором сообщения.",
                    { messageId, guildId: interaction.guildId }
                );
            }

            
            const endResult = await endGiveawayService(
                interaction.client,
                giveaway,
                interaction.guildId,
                interaction.user.id
            );

            const updatedGiveaway = endResult.giveaway;
            const winners = endResult.winners;

            
            const channel = await interaction.client.channels.fetch(
                updatedGiveaway.channelId,
            ).catch(err => {
                logger.warn(`Could not fetch channel ${updatedGiveaway.channelId}:`, err.message);
                return null;
            });

            if (!channel || !channel.isTextBased()) {
                throw new TitanBotError(
                    `Канал не найден: ${updatedGiveaway.channelId}`,
                    ErrorTypes.VALIDATION,
                    "Не удалось найти канал, на котором проводился розыгрыш. Информация о розыгрыше обновлена.",
                    { channelId: updatedGiveaway.channelId, messageId }
                );
            }

            const message = await channel.messages
                .fetch(messageId)
                .catch(err => {
                    logger.warn(`Could not fetch message ${messageId}:`, err.message);
                    return null;
                });

            if (!message) {
                throw new TitanBotError(
                    `Сообщение не найдено: ${messageId}`,
                    ErrorTypes.VALIDATION,
                    "Не удалось найти сообщение о розыгрыше. Информация о розыгрыше обновлена.",
                    { messageId, channelId: updatedGiveaway.channelId }
                );
            }

            
            await saveGiveaway(
                interaction.client,
                interaction.guildId,
                updatedGiveaway,
            );

            
            const newEmbed = createGiveawayEmbed(updatedGiveaway, "ended", winners);
            const newRow = createGiveawayButtons(true);

            await message.edit({
                content: "🎉 **РОЗЫГРЫШ ПРИЗОВ ЗАКОНЧИЛСЯ** 🎉",
                embeds: [newEmbed],
                components: [newRow],
            });

            
            if (winners.length > 0) {
                const winnerMentions = winners
                    .map((id) => `<@${id}>`)
                    .join(", ");
                await channel.send({
                    content: `🎉 поздравления ${winnerMentions}! Вы выиграли **${updatedGiveaway.prize}** Розыгрыш! Пожалуйста, свяжитесь с организатором <@${updatedGiveaway.hostId}> чтобы получить свой приз.`,
                });

                logger.info(`Giveaway ended with ${winners.length} winner(s): ${messageId}`);

                
                try {
                    await logEvent({
                        client: interaction.client,
                        guildId: interaction.guildId,
                        eventType: EVENT_TYPES.GIVEAWAY_WINNER,
                        data: {
                            description: `Розыгрыш призов закончился тем, что ${winners.length} победитель`,
                            channelId: channel.id,
                            userId: interaction.user.id,
                            fields: [
                                {
                                    name: '🎁 Приз',
                                    value: updatedGiveaway.prize || 'Mystery Prize!',
                                    inline: true
                                },
                                {
                                    name: '🏆 Победители',
                                    value: winnerMentions,
                                    inline: false
                                },
                                {
                                    name: '👥 Записи',
                                    value: endResult.participantCount.toString(),
                                    inline: true
                                }
                            ]
                        }
                    });
                } catch (logError) {
                    logger.debug('Событие победителя розыгрыша призов при регистрации ошибок:', logError);
                }
            } else {
                await channel.send({
                    content: `То розыгрыш призов для **${updatedGiveaway.prize}** Запись с действительными данными закончилась.`,
                });
                logger.info(`Giveaway ended with no winners: ${messageId}`);
            }

            logger.info(`Giveaway successfully ended by ${interaction.user.tag}: ${messageId}`);

            return InteractionHelper.safeReply(interaction, {
                embeds: [
                    successEmbed(
                        "Розыгрыш призов закончился ✅",
                        `Успешно завершился розыгрыш призов для **${updatedGiveaway.prize}** в ${channel}. Выбранный ${winners.length} победитель из ${endResult.participantCount} записи.`,
                    ),
                ],
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            await handleInteractionError(interaction, error, {
                type: 'command',
                commandName: 'gend',
                context: 'giveaway_end'
            });
        }
    },
};



