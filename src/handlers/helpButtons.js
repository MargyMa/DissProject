import { createEmbed } from '../utils/embeds.js';
import { createButton, createSelectMenu, getPaginationRow } from '../utils/components.js';
import { createAllCommandsMenu } from './helpSelectMenus.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMAND_LIST_ID = "help-command-list";
const BACK_BUTTON_ID = "help-back-to-main";
const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const PAGINATION_PREFIX = "help-page";
const BUG_REPORT_BUTTON_ID = "help-bug-report";

const CATEGORY_ICONS = {
    Core: "ℹ️",
    Moderation: "🛡️",
    Economy: "💰",
    Fun: "🎮",
    Leveling: "📊",
    Utility: "🔧",
    Ticket: "🎫",
    Welcome: "👋",
    Giveaway: "🎉",
    Counter: "🔢",
    Tools: "🛠️",
    Search: "🔍",
    Reaction_Roles: "🎭",
    Community: "👥",
    Birthday: "🎂",
    Config: "⚙️",
};

async function createCategorySelectMenu() {
    const commandsPath = path.join(__dirname, "../commands");
    const categoryDirs = (
        await fs.readdir(commandsPath, { withFileTypes: true })
    )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    const options = [
        {
            label: "📋 Все команды",
            description: "Просмотр всех доступных команд с разбивкой по страницам",
            value: ALL_COMMANDS_ID,
        },
        ...categoryDirs.map((category) => {
            const categoryName =
                category.charAt(0).toUpperCase() +
                category.slice(1).toLowerCase();
            const icon = CATEGORY_ICONS[categoryName] || "🔍";
            return {
                label: `${icon} ${categoryName}`,
                description: `Просмотр команд в ${categoryName} категория`,
                value: category,
            };
        }),
    ];

    const embed = createEmbed({
        title: "🤖 𝙀𝙫𝙤 Справочный центр",
        description: "Ваш универсальный партнер в Discord для модерации, экономии, развлечения и управления сервером.\n\n Выберите категорию ниже, чтобы ознакомиться с нашими командами:",
        color: 'primary'
    });

    embed.addFields(
        {
            name: "🛡️ **Модерация**",
            value: "Модерация сервера, управление пользователями и инструменты обеспечения соблюдения",
            inline: true
        },
        {
            name: "💰 **Экономика**",
            value: "Валютная система, магазины и виртуальная экономика",
            inline: true
        },
        {
            name: "🎮 **Веселье**",
            value: "Игры, развлечения и интерактивные команды",
            inline: true
        },
        {
            name: "📊 **Уровни**",
            value: "Уровни пользователей, система XP и отслеживание прогресса",
            inline: true
        },
        {
            name: "🎫 **Тикеты**",
            value: "Система тикетов поддержки для управления сервером",
            inline: true
        },
        {
            name: "🎉 **Розыгрыши**",
            value: "Автоматизированное управление раздачей подарков и их распространение",
            inline: true
        },
        {
            name: "👋 **Добро пожаловать**",
            value: "Приветственные сообщения участникам и регистрация",
            inline: true
        },
        {
            name: "🎂 **Дни рождения**",
            value: "Функции отслеживания дня рождения и празднования",
            inline: true
        },
        {
            name: "🔧 **Конфигурация**",
            value: "Команды управления конфигурацией сервера и бота",
            inline: true
        }
    );

    embed.setFooter({
        text: "Снова в строю  ❤️"
    });
    embed.setTimestamp();

    const bugReportButton = new ButtonBuilder()
        .setCustomId(BUG_REPORT_BUTTON_ID)
        .setLabel("Сообщить об ошибке")
        .setStyle(ButtonStyle.Danger);

    const supportButton = new ButtonBuilder()
        .setLabel("Дискорд сервер")
        .setURL("https://discord.gg/TYZAPe8y6J")
        .setStyle(ButtonStyle.Link);

    const touchpointButton = new ButtonBuilder()
        .setLabel("Ютубе")
        .setURL("https://www.youtube.com/@strinf1596")
        .setStyle(ButtonStyle.Link);

    const selectRow = createSelectMenu(
        CATEGORY_SELECT_ID,
        "Выберите, чтобы просмотреть команды",
        options,
    );

    const buttonRow = new ActionRowBuilder().addComponents([
        bugReportButton,
        supportButton,
        touchpointButton,
    ]);

    return {
        embeds: [embed],
        components: [buttonRow, selectRow],
    };
}

export const helpBackButton = {
    name: BACK_BUTTON_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { embeds, components } = await createCategorySelectMenu();
            await interaction.editReply({
                embeds,
                components,
            });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Отображает меню справки со всеми доступными командами.', {
                    event: 'interaction.help.button.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            throw error;
        }
    },
};

export const helpBugReportButton = {
    name: BUG_REPORT_BUTTON_ID,
    async execute(interaction, client) {
        const githubButton = new ButtonBuilder()
            .setLabel('🐛 Баг репорт')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/TYZAPe8y6J');

        const bugRow = new ActionRowBuilder().addComponents(githubButton);

        const bugReportEmbed = createEmbed({
            title: '🐛 Баг репорт',
            description: 'Нашли ошибку? Пожалуйста, сообщите о ней на нашей странице проблем!\n\n' +
                '**Сообщая об ошибке, пожалуйста, укажите:**\n' +
                '• 📝 Подробное описание проблемы\n' +
                '• 📋 Шаги по воспроизведению проблемы\n' +
                '• 📸 Скриншоты, если применимо\n' +
                'Это помогает нам устранять неполадки быстрее и эффективнее!',
            color: 'error'
        });
        bugReportEmbed.setFooter({
            text: 'Система сообщений об ошибках',
            iconURL: client.user.displayAvatarURL()
        });
        bugReportEmbed.setTimestamp();

        await interaction.reply({
            embeds: [bugReportEmbed],
            components: [bugRow],
            flags: MessageFlags.Ephemeral
        });
    },
};

export const helpReportCommand = {
    name: COMMAND_LIST_ID,
    categoryName: null,
    async execute(interaction, client) {
        
    }
};

function getPaginationInfo(components) {
    for (const row of components || []) {
        for (const component of row.components || []) {
            if (component.customId === `${PAGINATION_PREFIX}_page`) {
                const label = component.label || '';
                const match = label.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
                if (match) {
                    return {
                        currentPage: Number(match[1]),
                        totalPages: Number(match[2]),
                    };
                }
            }
        }
    }

    return { currentPage: 1, totalPages: 1 };
}

export const helpPaginationButton = {
    name: `${PAGINATION_PREFIX}_next`,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { currentPage, totalPages } = getPaginationInfo(interaction.message?.components);

            let nextPage = currentPage;
            switch (interaction.customId) {
                case `${PAGINATION_PREFIX}_first`:
                    nextPage = 1;
                    break;
                case `${PAGINATION_PREFIX}_prev`:
                    nextPage = Math.max(1, currentPage - 1);
                    break;
                case `${PAGINATION_PREFIX}_next`:
                    nextPage = Math.min(totalPages, currentPage + 1);
                    break;
                case `${PAGINATION_PREFIX}_last`:
                    nextPage = totalPages;
                    break;
                default:
                    nextPage = currentPage;
                    break;
            }

            const { embeds, components } = await createAllCommandsMenu(nextPage, client);
            await interaction.editReply({ embeds, components });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Взаимодействие с разбивкой по страницам справки уже подтверждено или срок действия которого истек.', {
                    event: 'interaction.help.pagination.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            throw error;
        }
    },
};


