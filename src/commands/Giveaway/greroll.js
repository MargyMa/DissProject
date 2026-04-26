import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes, handleInteractionError } from '../../utils/errorHandler.js';
import { getGuildGiveaways, saveGiveaway } from '../../utils/giveaways.js';
import { 
    selectWinners,
    createGiveawayEmbed, 
    createGiveawayButtons 
} from '../../services/giveawayService.js';
import { logEvent, EVENT_TYPES } from '../../services/loggingService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("greroll")
        .setDescription("Перезапускает розыгрыш для победителя (победителей) завершившегося розыгрыша.")
        .addStringOption((option) =>
            option
                .setName("messageid")
                .setDescription("Идентификатор сообщения об окончании розыгрыша.")
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
                    "Для повторного проведения розыгрыша вам потребуется разрешение «Управление сервером».",
                    { userId: interaction.user.id, guildId: interaction.guildId }
                );
            }

            logger.info(`Giveaway reroll initiated by ${interaction.user.tag} in guild ${interaction.guildId}`);

            const messageId = interaction.options.getString("messageid");

            
            if (!messageId || !/^\d+$/.test(messageId)) {
                throw new TitanBotError(
                    'Неверный формат идентификатора сообщения',
                    ErrorTypes.VALIDATION,
                    'Пожалуйста, укажите действительный идентификатор сообщения.',
                    { providedId: messageId }
                );
            }

            const giveaways = await getGuildGiveaways(
                interaction.client,
                interaction.guildId,
            );

            
            const giveaway = giveaways.find(g => g.messageId === messageId);

            if (!giveaway) {
                throw new TitanBotError(
                    `Раздача не найдено: ${messageId}`,
                    ErrorTypes.VALIDATION,
                    "В базе данных не найдено ни одного розыгрыша с таким идентификатором сообщения.",
                    { messageId, guildId: interaction.guildId }
                );
            }

            
            if (!giveaway.isEnded && !giveaway.ended) {
                throw new TitanBotError(
                    `Розыгрыш призов все еще активен: ${messageId}`,
                    ErrorTypes.VALIDATION,
                    "Этот розыгрыш все еще активен. Пожалуйста, напишите `/gend` чтобы покончить с этим первым.",
                    { messageId, status: 'active' }
                );
            }

            const participants = giveaway.participants || [];
            
            if (participants.length < giveaway.winnerCount) {
                throw new TitanBotError(
                    `Недостаточно участников для повторного розыгрыша: ${participants.length} < ${giveaway.winnerCount}`,
                    ErrorTypes.VALIDATION,
                    "Недостаточно заявок для определения необходимого количества победителей.",
                    { participantsCount: participants.length, winnersNeeded: giveaway.winnerCount }
                );
            }

            
            const newWinners = selectWinners(
                participants,
                giveaway.winnerCount,
            );

            
            const updatedGiveaway = {
                ...giveaway,
                winnerIds: newWinners,
                rerolledAt: new Date().toISOString(),
                rerolledBy: interaction.user.id
            };

            
            const channel = await interaction.client.channels.fetch(
                giveaway.channelId,
            ).catch(err => {
                logger.warn(`Could not fetch channel ${giveaway.channelId}:`, err.message);
                return null;
            });

            if (!channel || !channel.isTextBased()) {
                
                await saveGiveaway(
                    interaction.client,
                    interaction.guildId,
                    updatedGiveaway,
                );
                
                logger.warn(`Could not find channel for giveaway ${messageId}, but saved new winners to database`);
                
                return InteractionHelper.safeReply(interaction, {
                    embeds: [
                        successEmbed(
                            "Повторный розыгрыш завершен",
                            "Новые победители выбраны и сохранены в базе данных. Не удалось найти канал для объявления.",
                        ),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            
            const message = await channel.messages
                .fetch(messageId)
                .catch(err => {
                    logger.warn(`Could not fetch message ${messageId}:`, err.message);
                    return null;
                });

            if (!message) {
                
                await saveGiveaway(
                    interaction.client,
                    interaction.guildId,
                    updatedGiveaway,
                );

                const winnerMentions = newWinners
                    .map((id) => `<@${id}>`)
                    .join(", ");
                
                await channel.send({
                    content: `🔄 **РОЗЫГРЫШ ПОВТОРНО** 🔄 Новые победители для **${giveaway.prize}**: ${winnerMentions}!`,
                });

                logger.info(`Giveaway rerolled (message not found, but announced): ${messageId}`);

                try {
                    await logEvent({
                        client: interaction.client,
                        guildId: interaction.guildId,
                        eventType: EVENT_TYPES.GIVEAWAY_REROLL,
                        data: {
                            description: `Повторный розыгрыш призов: ${giveaway.prize}`,
                            channelId: giveaway.channelId,
                            userId: interaction.user.id,
                            fields: [
                                {
                                    name: '🎁 Приз',
                                    value: giveaway.prize || 'Mystery Prize!',
                                    inline: true
                                },
                                {
                                    name: '🏆 Новые победители',
                                    value: winnerMentions,
                                    inline: false
                                },
                                {
                                    name: '👥 Общее количество записей',
                                    value: participants.length.toString(),
                                    inline: true
                                }
                            ]
                        }
                    });
                } catch (logError) {
                    logger.debug('Error logging giveaway reroll:', logError);
                }

                return InteractionHelper.safeReply(interaction, {
                    embeds: [
                        successEmbed(
                            "Повторный розыгрыш завершен",
                            `Стали известны имена новых победителей ${channel}. (Исходное сообщение не найдено).`,
                        ),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            
            await saveGiveaway(
                interaction.client,
                interaction.guildId,
                updatedGiveaway,
            );

            const newEmbed = createGiveawayEmbed(updatedGiveaway, "reroll", newWinners);
            const newRow = createGiveawayButtons(true);

            await message.edit({
                content: "🔄 **РОЗЫГРЫШ ПО НОВОМУ РЕЙТИНГУ** 🔄",
                embeds: [newEmbed],
                components: [newRow],
            });

            const winnerMentions = newWinners
                .map((id) => `<@${id}>`)
                .join(", ");
            
            await channel.send({
                content: `🔄 **Победители повторного розыгрыша** 🔄 поздравления ${winnerMentions}! Вы - новый победитель для **${giveaway.prize}** Розыгрыш! Пожалуйста, свяжитесь с организатором <@${giveaway.hostId}> чтобы получить свой приз.`,
            });

            logger.info(`Giveaway successfully rerolled: ${messageId} with ${newWinners.length} new winners`);

            try {
                await logEvent({
                    client: interaction.client,
                    guildId: interaction.guildId,
                    eventType: EVENT_TYPES.GIVEAWAY_REROLL,
                    data: {
                        description: `Повторный розыгрыш призов: ${giveaway.prize}`,
                        channelId: giveaway.channelId,
                        userId: interaction.user.id,
                        fields: [
                            {
                                name: '🎁 Приз',
                                value: giveaway.prize || 'Mystery Prize!',
                                inline: true
                            },
                            {
                                name: '🏆 Новые победители',
                                value: winnerMentions,
                                inline: false
                            },
                            {
                                name: '👥 Общее количество записей',
                                value: participants.length.toString(),
                                inline: true
                            }
                        ]
                    }
                });
            } catch (logError) {
                logger.debug('Error logging giveaway reroll event:', logError);
            }

            return InteractionHelper.safeReply(interaction, {
                embeds: [
                    successEmbed(
                        "Повторный розыгрыш прошел успешно ✅",
                        `Успешно перезапустил розыгрыш **${giveaway.prize}** в ${channel}. Выбранный ${newWinners.length} новый победитель.`,
                    ),
                ],
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            logger.error('Error in greroll command:', error);
            await handleInteractionError(interaction, error, {
                type: 'command',
                commandName: 'greroll',
                context: 'giveaway_reroll'
            });
        }
    },
};



