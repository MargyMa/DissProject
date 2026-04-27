import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { getColor } from '../../config/bot.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName('google')
        .setDescription('Поиск в Google')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('Что бы вы хотели найти??')
                .setRequired(true)),
    async execute(interaction) {
        try {
            const query = interaction.options.getString('query');
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            
            const embed = createEmbed({
                title: 'Поиск в Google',
                description: `[Искать "${query}"](${searchUrl})`,
                color: 'info'
            })
            .setFooter({ text: 'Результаты поиска в Google' });

            await InteractionHelper.safeReply(interaction, { embeds: [embed] });
            
            logger.info('Google search link generated', {
                userId: interaction.user.id,
                query: query,
                guildId: interaction.guildId,
                commandName: 'google'
            });
        } catch (error) {
            logger.error('Error in google command', {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'google'
            });
            await handleInteractionError(interaction, error, {
                commandName: 'google',
                source: 'google_search'
            });
        }
    },
};


