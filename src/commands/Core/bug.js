import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName("bug")
        .setDescription("Сообщите об ошибке или проблеме в работе бота"),

    async execute(interaction) {
        const githubButton = new ButtonBuilder()
            .setLabel('?? Сообщить об ошибке')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/TYZAPe8y6J');

        const row = new ActionRowBuilder().addComponents(githubButton);

        const bugReportEmbed = createEmbed({
            title: '?? Отчет об ошибке',
            description: 'Нашли ошибку? Пожалуйста, сообщите о ней на нашем Discord!\n\n' +
            '**При сообщении об ошибке, пожалуйста, укажите:**\n' +
            '• ?? Подробное описание проблемы\n' +
            '• ?? Шаги по воспроизведению проблемы\n' +
            '• ?? Скриншоты, если применимо\n' +
            'Это помогает нам решать проблемы быстрее и эффективнее!',
            color: 'error'
        })
            .setTimestamp();

        await InteractionHelper.safeReply(interaction, {
            embeds: [bugReportEmbed],
            components: [row],
        });
    },
};




