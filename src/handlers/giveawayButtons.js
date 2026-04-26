import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { TitanBotError, ErrorTypes, handleInteractionError } from '../utils/errorHandler.js';
import { 
    getGuildGiveaways, 
    saveGiveaway, 
    isGiveawayEnded 
} from '../utils/giveaways.js';
import { 
    selectWinners,
    isUserRateLimited,
    recordUserInteraction,
    createGiveawayEmbed,
    createGiveawayButtons
} from '../services/giveawayService.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';




export const giveawayJoinHandler = {
    customId: 'giveaway_join',
    async execute(interaction, client) {
        try {
            
            if (isUserRateLimited(interaction.user.id, interaction.message.id)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed(
                            'Ставка ограничена',
                            'Пожалуйста, подождите немного, прежде чем снова принять участие в розыгрыше.'
                        )
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            recordUserInteraction(interaction.user.id, interaction.message.id);

            const guildGiveaways = await getGuildGiveaways(client, interaction.guildId);
            const giveaway = guildGiveaways.find(g => g.messageId === interaction.message.id);

            if (!giveaway) {
                throw new TitanBotError(
                    'Розыгрыш не найден в базе данных',
                    ErrorTypes.VALIDATION,
                    'Эта акция больше не проводится.',
                    { messageId: interaction.message.id, guildId: interaction.guildId }
                );
            }

            
            const endedByTime = isGiveawayEnded(giveaway);
            const endedByFlag = giveaway.ended || giveaway.isEnded;

            if (endedByTime || endedByFlag) {
                return interaction.reply({
                    embeds: [
                        errorEmbed(
                            'Розыгрыш призов закончился',
                            'Этот розыгрыш уже закончился.'
                        )
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            const participants = giveaway.participants || [];
            const userId = interaction.user.id;

            
            if (participants.includes(userId)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed(
                            'Уже введенный',
                            'Вы уже приняли участие в розыгрыше! 🎉'
                        )
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            
            participants.push(userId);
            giveaway.participants = participants;

            await saveGiveaway(client, interaction.guildId, giveaway);

            logger.debug(`User ${interaction.user.tag} joined giveaway ${interaction.message.id}`);

            
            const updatedEmbed = createGiveawayEmbed(giveaway, 'active');
            const updatedRow = createGiveawayButtons(false);

            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: [updatedRow]
            });

            await interaction.reply({
                embeds: [
                    successEmbed(
                        'Успех! Вы приняли участие в розыгрыше! 🎉',
                        `Удачи! Теперь их двое ${participants.length} запись/записи.`
                    )
                ],
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            logger.error('Error in giveaway join handler:', error);
            await handleInteractionError(interaction, error, {
                type: 'button',
                customId: 'giveaway_join',
                handler: 'giveaway'
            });
        }
    }
};




export const giveawayEndHandler = {
    customId: 'giveaway_end',
    async execute(interaction, client) {
        try {
            
            if (!interaction.inGuild()) {
                throw new TitanBotError(
                    'Кнопка, используемая вне гильдии',
                    ErrorTypes.VALIDATION,
                    'Эту кнопку можно использовать только на сервере.',
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

            const guildGiveaways = await getGuildGiveaways(client, interaction.guildId);
            const giveaway = guildGiveaways.find(g => g.messageId === interaction.message.id);

            if (!giveaway) {
                throw new TitanBotError(
                    'Розыгрыш не найден в базе данных',
                    ErrorTypes.VALIDATION,
                    'Эта акция больше не проводится.',
                    { messageId: interaction.message.id, guildId: interaction.guildId }
                );
            }

            if (giveaway.ended || giveaway.isEnded || isGiveawayEnded(giveaway)) {
                throw new TitanBotError(
                    'Розыгрыш призов уже закончился',
                    ErrorTypes.VALIDATION,
                    'Этот розыгрыш уже закончился.',
                    { messageId: interaction.message.id }
                );
            }

            const participants = giveaway.participants || [];
            const winners = selectWinners(participants, giveaway.winnerCount);

            
            giveaway.ended = true;
            giveaway.isEnded = true;
            giveaway.winnerIds = winners;
            giveaway.endedAt = new Date().toISOString();
            giveaway.endedBy = interaction.user.id;

            await saveGiveaway(client, interaction.guildId, giveaway);

            logger.info(`Giveaway ended via button by ${interaction.user.tag}: ${interaction.message.id}`);

            
            const updatedEmbed = createGiveawayEmbed(giveaway, 'ended', winners);
            const updatedRow = createGiveawayButtons(true);

            await interaction.message.edit({
                content: '🎉 **РОЗЫГРЫШ ПРИЗОВ ЗАКОНЧИЛСЯ** 🎉',
                embeds: [updatedEmbed],
                components: [updatedRow]
            });

            
            try {
                await logEvent({
                    client,
                    guildId: interaction.guildId,
                    eventType: EVENT_TYPES.GIVEAWAY_WINNER,
                    data: {
                        description: `Розыгрыш призов закончился тем, что ${winners.length} победитель`,
                        channelId: interaction.channelId,
                        userId: interaction.user.id,
                        fields: [
                            {
                                name: '🎁 Приз',
                                value: giveaway.prize || 'Таинственный приз!',
                                inline: true
                            },
                            {
                                name: '🏆 Победители',
                                value: winners.length > 0 
                                    ? winners.map(id => `<@${id}>`).join(', ')
                                    : 'Нет действительных записей',
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
                logger.debug('Error logging giveaway end event:', logError);
            }

            await interaction.reply({
                embeds: [
                    successEmbed(
                        `Розыгрыш призов закончился ✅`,
                        `Розыгрыш призов завершен ${winners.length} Победитель(и) выбраны!`
                    )
                ],
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            logger.error('Error in giveaway end handler:', error);
            await handleInteractionError(interaction, error, {
                type: 'button',
                customId: 'giveaway_end',
                handler: 'giveaway'
            });
        }
    }
};




export const giveawayRerollHandler = {
    customId: 'giveaway_reroll',
    async execute(interaction, client) {
        try {
            
            if (!interaction.inGuild()) {
                throw new TitanBotError(
                    'Кнопка, используемая вне гильдии',
                    ErrorTypes.VALIDATION,
                    'Эту кнопку можно использовать только на сервере.',
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

            const guildGiveaways = await getGuildGiveaways(client, interaction.guildId);
            const giveaway = guildGiveaways.find(g => g.messageId === interaction.message.id);

            if (!giveaway) {
                throw new TitanBotError(
                    'Розыгрыш не найден в базе данных',
                    ErrorTypes.VALIDATION,
                    'Эта акция больше не проводится.',
                    { messageId: interaction.message.id, guildId: interaction.guildId }
                );
            }

            if (!giveaway.ended && !giveaway.isEnded) {
                throw new TitanBotError(
                    'Розыгрыш призов все еще активен',
                    ErrorTypes.VALIDATION,
                    'Этот розыгрыш еще не закончился. Пожалуйста, завершите его.',
                    { messageId: interaction.message.id }
                );
            }

            const participants = giveaway.participants || [];
            
            if (participants.length === 0) {
                throw new TitanBotError(
                    'Нет участников для повторного розыгрыша',
                    ErrorTypes.VALIDATION,
                    'Нет записей для повторного прохождения.',
                    { messageId: interaction.message.id }
                );
            }

            const newWinners = selectWinners(participants, giveaway.winnerCount);

            
            giveaway.winnerIds = newWinners;
            giveaway.rerolledAt = new Date().toISOString();
            giveaway.rerolledBy = interaction.user.id;

            await saveGiveaway(client, interaction.guildId, giveaway);

            logger.info(`Giveaway rerolled via button by ${interaction.user.tag}: ${interaction.message.id}`);

            
            const updatedEmbed = createGiveawayEmbed(giveaway, 'reroll', newWinners);
            const updatedRow = createGiveawayButtons(true);

            await interaction.message.edit({
                content: '🔄 **РОЗЫГРЫШ ПО НОВОМУ РЕЙТИНГУ** 🔄',
                embeds: [updatedEmbed],
                components: [updatedRow]
            });

            
            try {
                await logEvent({
                    client,
                    guildId: interaction.guildId,
                    eventType: EVENT_TYPES.GIVEAWAY_REROLL,
                    data: {
                        description: `Повторный розыгрыш призов`,
                        channelId: interaction.channelId,
                        userId: interaction.user.id,
                        fields: [
                            {
                                name: '🎁 Приз',
                                value: giveaway.prize || 'Таинственный приз!',
                                inline: true
                            },
                            {
                                name: '🏆 Новые победители',
                                value: newWinners.map(id => `<@${id}>`).join(', '),
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

            await interaction.reply({
                embeds: [
                    successEmbed(
                        'Розыгрыш с перевыбором ✅',
                        `Были выбраны новые победители!`
                    )
                ],
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            logger.error('Error in giveaway reroll handler:', error);
            await handleInteractionError(interaction, error, {
                type: 'button',
                customId: 'giveaway_reroll',
                handler: 'giveaway'
            });
        }
    }
};

export const giveawayViewHandler = {
    customId: 'giveaway_view',
    async execute(interaction, client) {
        try {
            if (!interaction.inGuild()) {
                throw new TitanBotError(
                    'Кнопка, используемая вне гильдии',
                    ErrorTypes.VALIDATION,
                    'Эту кнопку можно использовать только на сервере.',
                    { userId: interaction.user.id }
                );
            }

            const guildGiveaways = await getGuildGiveaways(client, interaction.guildId);
            const giveaway = guildGiveaways.find(g => g.messageId === interaction.message.id);

            if (!giveaway) {
                throw new TitanBotError(
                    'Розыгрыш не найден в базе данных',
                    ErrorTypes.VALIDATION,
                    'Этот розыгрыш не найден.',
                    { messageId: interaction.message.id, guildId: interaction.guildId }
                );
            }

            if (!giveaway.ended && !giveaway.isEnded && !isGiveawayEnded(giveaway)) {
                return interaction.reply({
                    embeds: [
                        errorEmbed(
                            'Розыгрыш призов все еще активен',
                            'Розыгрыш еще не закончился, поэтому победители пока недоступны.'
                        )
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            const winnerIds = Array.isArray(giveaway.winnerIds) ? giveaway.winnerIds : [];
            const winnerMentions = winnerIds.length > 0
                ? winnerIds.map(id => `<@${id}>`).join(', ')
                : 'В этом розыгрыше не было выявлено победителей.';

            await interaction.reply({
                embeds: [
                    successEmbed(
                        `Победители за ${giveaway.prize || 'в этом розыгрыше'} 🎉`,
                        winnerMentions
                    )
                ],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            logger.error('Error in giveaway view handler:', error);
            await handleInteractionError(interaction, error, {
                type: 'button',
                customId: 'giveaway_view',
                handler: 'giveaway'
            });
        }
    }
};



