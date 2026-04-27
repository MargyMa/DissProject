import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import axios from 'axios';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getColor } from '../../config/bot.js';

export default {
    data: new SlashCommandBuilder()
        .setName('define')
        .setDescription('Найдите определение слова')
        .addStringOption(option => 
            option.setName('word')
                .setDescription('Слово, которое нужно найти')
                .setRequired(true)),
    async execute(interaction) {
        try {
            
            const deferred = await InteractionHelper.safeDefer(interaction);
            if (!deferred) {
                return;
            }

            const word = interaction.options.getString('word');
            
            if (word.length < 2) {
                logger.warn('Define command - word too short', {
                    userId: interaction.user.id,
                    word: word,
                    guildId: interaction.guildId
                });
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('Ошибка', 'Пожалуйста, введите слово длиной не менее 2 символов.')],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const response = await axios.get(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
                { timeout: 5000 }
            );
            
            if (!response.data || response.data.length === 0) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('не найдено', `Не найдено определений для "${word}".`)]
                });
            }
            
            const data = response.data[0];
            const embed = createEmbed({
                title: data.word,
                description: data.phonetic ? `*${data.phonetic}*` : '',
                color: 'success'
            });
            
            data.meanings.slice(0, 5).forEach(meaning => {
                const definitions = meaning.definitions
                    .slice(0, 3)
                    .map((def, idx) => {
                        let text = `${idx + 1}. ${def.definition}`;
                        if (def.example) {
                            text += `\n   *Example: ${def.example}*`;
                        }
                        return text;
                    })
                    .join('\n\n');
                
                if (definitions) {
                    embed.addFields({
                        name: `**${meaning.partOfSpeech || 'Определение'}**`,
                        value: definitions,
                        inline: false
                    });
                }
            });
            
            embed.setFooter({ text: 'Работает на основе бесплатного словарного API' });
            
            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            
            logger.info('Dictionary definition retrieved', {
                userId: interaction.user.id,
                word: word,
                guildId: interaction.guildId,
                commandName: 'define'
            });
            
        } catch (error) {
            logger.error('Dictionary lookup error', {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id,
                word: interaction.options.getString('word'),
                guildId: interaction.guildId,
                commandName: 'define'
            });
            
            
            if (error.response?.status === 404) {
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('не найдено', `Не найдено определений для "${interaction.options.getString('word')}".`)]
                });
            } else {
                await handleInteractionError(interaction, error, {
                    commandName: 'define',
                    source: 'dictionary_api'
                });
            }
        }
    },
};


