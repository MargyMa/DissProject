import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, warningEmbed } from '../../utils/embeds.js';
import { getConfirmationButtons } from '../../utils/components.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName('wipedata')
        .setDescription('Удалите все свои личные данные из бота (необратимый)'),

    async execute(interaction, guildConfig, client) {
        try {
            const warningMessage = 
                `⚠️ **ЭТО ДЕЙСТВИЕ НЕОБРАТИМО!** ⚠️\n\n` +
                `Это приведет к безвозвратному удалению **ВСЕХ** ваших данных с этого сервера, включая:\n` +
                `• 💰 Экономический баланс (бумажник & банк)\n` +
                `• 📊 Уровни и опыт\n` +
                `• 🎒 Предметы инвентаря\n` +
                `• 🛍️ Покупки в магазине\n` +
                `• 🎂 Информация о дне рождения\n` +
                `• 🔢 Данные счетчика\n` +
                `• 📋 Все остальные персональные данные\n\n` +
                `**Это нельзя отменить. Вы абсолютно уверены?**`;

            const embed = warningEmbed(warningMessage, '🗑️ Сотрите все данные');

            const confirmButtons = getConfirmationButtons('wipedata');

            await InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                components: [confirmButtons],
                flags: MessageFlags.Ephemeral
            });

            logger.info(`Wipedata command executed - confirmation prompt shown`, {
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
        } catch (error) {
            logger.error(`Wipedata command execution failed`, {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'wipedata'
            });
            await handleInteractionError(interaction, error, {
                commandName: 'wipedata',
                source: 'wipedata_command'
            });
        }
    }
};




