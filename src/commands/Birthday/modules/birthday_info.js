import { MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { getUserBirthday } from '../../../services/birthdayService.js';
import { logger } from '../../../utils/logger.js';
import { handleInteractionError } from '../../../utils/errorHandler.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';
export default {
    async execute(interaction, config, client) {
        try {
            await InteractionHelper.safeDefer(interaction);

            const targetUser = interaction.options.getUser("user") || interaction.user;
            const userId = targetUser.id;
            const guildId = interaction.guildId;

            
            const birthdayData = await getUserBirthday(client, guildId, userId);

            if (!birthdayData) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [createEmbed({
                        title: '❌ Дата рождения не найдена',
                        description: targetUser.id === interaction.user.id 
                            ? "Вы еще не указали свой день рождения. Воспользуйся `/birthday set` чтобы добавить его!"
                            : `${targetUser.username} еще не установил дату своего дня рождения.`,
                        color: 'error'
                    })]
                });
            }
            
            const embed = createEmbed({
                title: "🎂 Информация о дне рождения",
                description: `**Дата:** ${birthdayData.monthName} ${birthdayData.day}\n**Пользователь:** ${targetUser.toString()}`,
                color: 'info',
                footer: targetUser.id === interaction.user.id ? "Твой день рождения" : `${targetUser.username}'s День рождения`
            });
            
            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            
            logger.info('Информация о дне рождения успешно получена', {
                userId: interaction.user.id,
                targetUserId: targetUser.id,
                guildId,
                commandName: 'birthday_info'
            });
        } catch (error) {
            logger.error("Ошибка при выполнении команды Информация о дне рождения", {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'birthday_info'
            });
            await handleInteractionError(interaction, error, {
                commandName: 'birthday_info',
                source: 'birthday_info_module'
            });
        }
    }
};



