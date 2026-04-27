import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import axios from 'axios';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getGuildConfig } from '../../services/guildConfig.js';
import { getColor } from '../../config/bot.js';

export default {
    data: new SlashCommandBuilder()
        .setName('urban')
        .setDescription('Найдите определения в городском словаре')
        .addStringOption(option => 
            option.setName('term')
                .setDescription('Термин, который стоит поискать в Urban Dictionary')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            const term = interaction.options.getString('term');
            
            if (term.length < 2) {
                logger.warn('Urban command - term too short', {
                    userId: interaction.user.id,
                    term: term,
                    guildId: interaction.guildId
                });
                return await InteractionHelper.safeReply(interaction, {
                    embeds: [errorEmbed('Ошибка', 'Пожалуйста, введите термин, состоящий как минимум из двух символов.')],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const guildConfig = await getGuildConfig(interaction.client, interaction.guild?.id);
            if (guildConfig?.disabledCommands?.includes('urban')) {
                logger.warn('Urban command disabled in guild', {
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'urban'
                });
                return await InteractionHelper.safeReply(interaction, {
                    embeds: [errorEmbed('Команда отключена', 'Команда Urban Dictionary отключена на этом сервере.')],
                    flags: MessageFlags.Ephemeral
                });
            }

            let deferTimer = null;
            const clearDeferTimer = () => {
                if (deferTimer) {
                    clearTimeout(deferTimer);
                    deferTimer = null;
                }
            };

            deferTimer = setTimeout(() => {
                InteractionHelper.safeDefer(interaction).catch((deferError) => {
                    logger.debug('Urban command defer fallback failed', {
                        error: deferError?.message,
                        interactionId: interaction.id,
                        commandName: 'urban'
                    });
                });
            }, 1500);
            
            const response = await axios.get(
                `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`,
                { timeout: 5000 }
            );
            clearDeferTimer();
            
            if (!response.data?.list?.length) {
                return await InteractionHelper.safeReply(interaction, {
                    embeds: [errorEmbed('не найдено', `Не найдено определений для "${term}" о городском словаре.`)]
                });
            }
            
            const definition = response.data.list[0];
            const cleanDefinition = definition.definition.replace(/\[|\]/g, '');
            const cleanExample = definition.example.replace(/\[|\]/g, '');
            
            const formattedDefinition = cleanDefinition
.replace(/\n\s*\n/g, '\n\n')
                .slice(0, 2000);
                
            const formattedExample = cleanExample
                ? `*"${cleanExample.replace(/\n/g, ' ').slice(0, 500)}..."*`
                : '*Никаких примеров приведено не было*';
            
            const embed = createEmbed({
                title: definition.word,
                description: formattedDefinition,
                color: 'info'
            })
            .setURL(definition.permalink)
            .addFields(
                { 
                    name: 'Пример', 
                    value: formattedExample,
                    inline: false 
                },
                { 
                    name: 'Статистика', 
                    value: `👍 ${definition.thumbs_up.toLocaleString()} • 👎 ${definition.thumbs_down.toLocaleString()}`,
                    inline: true 
                },
                { 
                    name: 'Автор', 
                    value: definition.author || 'Анонимный',
                    inline: true 
                }
            )
            .setFooter({ 
                text: 'Городской словарь',
                iconURL: 'https://i.imgur.com/8aQrX3a.png' 
            });
                
            await InteractionHelper.safeReply(interaction, { embeds: [embed] });
            
            logger.info('Urban Dictionary definition retrieved', {
                userId: interaction.user.id,
                term: term,
                guildId: interaction.guildId,
                commandName: 'urban'
            });
            
        } catch (error) {
            logger.error('Urban Dictionary error', {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id,
                term: interaction.options.getString('term'),
                guildId: interaction.guildId,
                apiStatus: error.response?.status,
                commandName: 'urban'
            });
            
            
            if (error.response?.status === 404 || !error.response) {
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('не найдено', `Не найдено определений для "${interaction.options.getString('term')}" о городском словаре.`)]
                });
            } else if (error.response?.status === 429) {
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('Ставка ограничена', 'Слишком много запросов к Urban Dictionary. Пожалуйста, повторите попытку через несколько минут.')]
                });
            } else {
                await handleInteractionError(interaction, error, {
                    commandName: 'urban',
                    source: 'urban_dictionary_api'
                });
            }
        }
    },
};




