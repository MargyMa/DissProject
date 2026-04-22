import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getModerationCases } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName('cases')
        .setDescription('Просмотр случаев модерации и журналов аудита')
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Фильтрация обращений по типу или пользователю')
                .addChoices(
                    { name: 'Все случаи', value: 'all' },
                    { name: 'Баны', value: 'Member Banned' },
                    { name: 'Исключения', value: 'Member Kicked' },
                    { name: 'Тайм-Ауты', value: 'Member Timed Out' },
                    { name: 'Предупреждения', value: 'User Warned' }
                )
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Фильтровать обращения по конкретному пользователю')
        )
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Количество случаев, которые необходимо показать (default: 10)')
                .setMinValue(1)
                .setMaxValue(50)
        ),

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Случаи, когда не удалось отложить взаимодействие`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'cases'
            });
            return;
        }

        try {
            const filterType = interaction.options.getString('filter') || 'all';
            const targetUser = interaction.options.getUser('user');
            const limit = interaction.options.getInteger('limit') || 10;

            const filters = {
                limit,
                action: filterType === 'all' ? undefined : filterType,
                userId: targetUser?.id
            };

            const cases = await getModerationCases(interaction.guild.id, filters);

            if (cases.length === 0) {
                throw new Error(targetUser 
                    ? `Не найдено случаев модерации для ${targetUser.tag}`
                    : `Нет ${filterType === 'all' ? '' : filterType} обращения, найденные на этом сервере.`
                );
            }

            const CASES_PER_PAGE = 5;
            const totalPages = Math.ceil(cases.length / CASES_PER_PAGE);
            let currentPage = 1;

            const createCasesEmbed = (page) => {
                const startIndex = (page - 1) * CASES_PER_PAGE;
                const endIndex = startIndex + CASES_PER_PAGE;
                const pageCases = cases.slice(startIndex, endIndex);

                const embed = createEmbed({
                    title: '📋 Случаи модерации',
                    description: `Отображение примеров модерации для **${interaction.guild.name}**\n\n**Страница ${page} от ${totalPages}**`
                });

                pageCases.forEach(case_ => {
                    const date = new Date(case_.createdAt).toLocaleDateString();
                    const time = new Date(case_.createdAt).toLocaleTimeString();
                    
                    embed.addFields({
                        name: `Case #${case_.caseId} - ${case_.action}`,
                        value: `**Цель:** ${case_.target}\n**Модератор:** ${case_.executor}\n**Дата:** ${date} at ${time}\n**Причина:** ${case_.reason || 'Причина не указана'}`,
                        inline: false
                    });
                });

                embed.setFooter({
                    text: `Общее количество случаев: ${cases.length} | Фильтр: ${filterType}${targetUser ? ` | Пользователь: ${targetUser.tag}` : ''}`
                });

                return embed;
            };

            const createNavigationRow = (page) => {
                const row = new ActionRowBuilder();
                
                const prevButton = new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ Предыдущий')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1);

                const pageInfoButton = new ButtonBuilder()
                    .setCustomId('page_info')
                    .setLabel(`Page ${page}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true);

                const nextButton = new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Следующий ➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages);

                row.addComponents(prevButton, pageInfoButton, nextButton);
                return row;
            };

            const message = await interaction.editReply({ 
                embeds: [createCasesEmbed(currentPage)], 
                components: [createNavigationRow(currentPage)]
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
time: 120000
            });

            collector.on('collect', async (buttonInteraction) => {
                await buttonInteraction.deferUpdate();

                if (buttonInteraction.user.id !== interaction.user.id) {
                    await buttonInteraction.followUp({
                        content: 'Вы не можете использовать эти кнопки. Запустите `/cases`, чтобы открыть собственное представление дел.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const { customId } = buttonInteraction;

                if (customId === 'prev_page' && currentPage > 1) {
                    currentPage--;
                } else if (customId === 'next_page' && currentPage < totalPages) {
                    currentPage++;
                }

                await buttonInteraction.editReply({
                    embeds: [createCasesEmbed(currentPage)],
                    components: [createNavigationRow(currentPage)]
                });
            });

            collector.on('end', async () => {
                const disabledRow = createNavigationRow(currentPage);
                disabledRow.components.forEach(button => button.setDisabled(true));
                
                try {
                    await message.edit({
                        components: [disabledRow]
                    });
                } catch (error) {
                }
            });

        } catch (error) {
            logger.error('Error in cases command:', error);
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed(
                        'Системная ошибка',
                        'Произошла ошибка при получении данных о случаях модерации. Пожалуйста, повторите попытку позже.'
                    )
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};




