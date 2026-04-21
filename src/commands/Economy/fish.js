import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { MessageTemplates } from '../../utils/messageTemplates.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const FISH_COOLDOWN = 45 * 60 * 1000; 
const BASE_MIN_REWARD = 300;
const BASE_MAX_REWARD = 900;
const FISHING_ROD_MULTIPLIER = 1.5;

const FISH_TYPES = [
    { name: 'Окунь', emoji: '🐟', rarity: 'common' },
    { name: 'Лосось', emoji: '🐟', rarity: 'common' },
    { name: 'Форель', emoji: '🐟', rarity: 'common' },
    { name: 'Тунец', emoji: '🐟', rarity: 'uncommon' },
    { name: 'Рыба-Меч', emoji: '🐟', rarity: 'uncommon' },
    { name: 'Осьминог', emoji: '🐙', rarity: 'rare' },
    { name: 'Рак', emoji: '🦞', rarity: 'rare' },
    { name: 'Акула', emoji: '🦈', rarity: 'epic' },
    { name: 'Кит', emoji: '🐋', rarity: 'legendary' },
];

const CATCH_MESSAGES = [
    "Вы забрасываете удочку в кристально чистые воды...",
    "Вы терпеливо ждете, пока ваш поплавок всплывет на поверхность...",
    "После нескольких минут ожидания вы чувствуете толчок...",
    "Вода покрывается рябью, когда кто-то заглатывает твою наживку...",
    "Вы наматываете свой улов с экспертной точностью...",
];

export default {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Отправляйтесь на рыбалку, чтобы наловить рыбы и заработать денег'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);
            const lastFish = userData.lastFish || 0;
            const hasFishingRod = userData.inventory["fishing_rod"] || 0;

            if (now < lastFish + FISH_COOLDOWN) {
                const remaining = lastFish + FISH_COOLDOWN - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor(
                    (remaining % (1000 * 60 * 60)) / (1000 * 60),
                );

                throw createError(
                    "Время восстановления после рыбалки активно",
                    ErrorTypes.RATE_LIMIT,
                    `Вы слишком устали, чтобы ловить рыбу прямо сейчас. Отдохните немного **${hours}h ${minutes}m** перед повторной рыбалкой.`,
                    { remaining, cooldownType: 'fish' }
                );
            }

            
            const rand = Math.random();
            let fishCaught;
            
            if (rand < 0.5) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'common')[Math.floor(Math.random() * 3)];
            } else if (rand < 0.75) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'uncommon')[Math.floor(Math.random() * 2)];
            } else if (rand < 0.9) {
                
                fishCaught = FISH_TYPES.filter(f => f.rarity === 'rare')[Math.floor(Math.random() * 2)];
            } else if (rand < 0.98) {
                
                fishCaught = FISH_TYPES.find(f => f.rarity === 'epic');
            } else {
                
                fishCaught = FISH_TYPES.find(f => f.rarity === 'legendary');
            }

            const baseEarned = Math.floor(
                Math.random() * (BASE_MAX_REWARD - BASE_MIN_REWARD + 1)
            ) + BASE_MIN_REWARD;

            let finalEarned = baseEarned;
            let multiplierMessage = "";

            
            if (hasFishingRod > 0) {
                finalEarned = Math.floor(baseEarned * FISHING_ROD_MULTIPLIER);
                multiplierMessage = `\n🎣 **Бонус к удочке: +50%**`;
            }

            const catchMessage = CATCH_MESSAGES[Math.floor(Math.random() * CATCH_MESSAGES.length)];

            userData.wallet += finalEarned;
            userData.lastFish = now;

            await setEconomyData(client, guildId, userId, userData);

            const rarityColors = {
                common: '#95A5A6',
                uncommon: '#2ECC71',
                rare: '#3498DB',
                epic: '#9B59B6',
                legendary: '#F1C40F'
            };

            const embed = createEmbed({
                title: '🎣 Удачной рыбалки!',
                description: `${catchMessage}\n\nВы поймали **${fishCaught.emoji} ${fishCaught.name}**! Вы продали его за **$${finalEarned.toLocaleString()}**!${multiplierMessage}`,
                color: rarityColors[fishCaught.rarity]
            })
                .addFields(
                    {
                        name: "💵 Новый денежный баланс",
                        value: `$${userData.wallet.toLocaleString()}`,
                        inline: true,
                    },
                    {
                        name: "🐟 Редкость",
                        value: fishCaught.rarity.charAt(0).toUpperCase() + fishCaught.rarity.slice(1),
                        inline: true,
                    }
                )
                .setFooter({ text: `Следующая поездка на рыбалку состоится через 45 минут.` });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'fish' })
};
