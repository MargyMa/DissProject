import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import {
    createSelectMenu,
} from "../../utils/components.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const BUG_REPORT_BUTTON_ID = "help-bug-report";
const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

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





async function createInitialHelpMenu(client) {
    const commandsPath = path.join(__dirname, "../../commands");
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

    const botName = client?.user?.username || "Bot";
    const embed = createEmbed({ 
        title: `🤖 ${botName} Справочный центр`,
        description: "Ваш универсальный партнер Discord для модерации, экономии, развлечения и управления серверами.",
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
            name: "👥 **Сообщество**",
            value: "Инструменты сообщества, приложения и вовлечение участников",
            inline: true
        },
        {
            name: "⚙️ **Конфигурация**",
            value: "Команды управления конфигурацией сервера и бота",
            inline: true
        },
        {
            name: "🔢 **Счетчик**",
            value: "Настройка канала счетчика в реальном времени и управление счетчиком",
            inline: true
        },
        {
            name: "🎙️ **Присоединяйтесь, чтобы создать**",
            value: "Создание динамического голосового канала и управление им",
            inline: true
        },
        {
            name: "🎭 **Реакция Роли**",
            value: "Самостоятельно назначаемые роли с использованием систем реагирования на роли",
            inline: true
        },
        {
            name: "✅ **Проверка**",
            value: "Рабочие процессы проверки участников и организация доступа",
            inline: true
        },
        {
            name: "🔧 **Утилиты**",
            value: "Полезные инструменты и серверные утилиты",
            inline: true
        }
    );

    embed.setFooter({ 
        text: "Снова в строю ❤️" 
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

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Отображает меню справки со всеми доступными командами"),

    async execute(interaction, guildConfig, client) {
        
        const { MessageFlags } = await import('discord.js');
        await InteractionHelper.safeDefer(interaction);
        
        const { embeds, components } = await createInitialHelpMenu(client);

        await InteractionHelper.safeEditReply(interaction, {
            embeds,
            components,
        });

        setTimeout(async () => {
            try {
                const closedEmbed = createEmbed({
                    title: "Меню справки закрыто",
                    description: "Меню "Помощи" закрыто, снова воспользуйтесь /help.",
                    color: "secondary",
                });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [closedEmbed],
                    components: [],
                });
            } catch (error) {
                
            }
        }, HELP_MENU_TIMEOUT_MS);
    },
};


