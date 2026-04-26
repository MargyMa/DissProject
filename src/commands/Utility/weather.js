import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

export default {
    data: new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Получайте информацию о погоде в реальном времени для любого места")
        .addStringOption((option) =>
            option
                .setName("city")
                .setDescription("Название города, например., 'Лондон' или 'Токио'")
                .setRequired(true),
        ),

    async execute(interaction) {
        try {
            const deferSuccess = await InteractionHelper.safeDefer(interaction);
            if (!deferSuccess) {
                logger.warn(`Weather interaction defer failed`, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'weather'
                });
                return;
            }

            const city = interaction.options.getString("city");

            const geoResponse = await fetch(
                `${GEOCODING_URL}?name=${encodeURIComponent(city)}`,
            );
            const geoData = await geoResponse.json();

            if (!geoData.results || geoData.results.length === 0) {
                logger.info(`Weather command - city not found`, {
                    userId: interaction.user.id,
                    city: city,
                    guildId: interaction.guildId
                });
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed(
                            "Город Не найден",
                            `Не удалось найти местоположение **${city}**. Пожалуйста, проверьте правильность написания.`,
                        ),
                    ],
                });
                return;
            }

            const { latitude, longitude, name, country } = geoData.results[0];
            const cityDisplay = name;

            const weatherResponse = await fetch(
                `${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
            );
            const weatherData = await weatherResponse.json();

            if (weatherData.error) {
                logger.error(`Weather API error`, {
                    error: weatherData.reason,
                    city: city,
                    userId: interaction.user.id,
                    guildId: interaction.guildId
                });
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed(
                            "Ошибка API",
                            "Произошла ошибка метеорологической службы.",
                        ),
                    ],
                });
                return;
            }

            const current = weatherData.current || weatherData.current_weather || {};
            const temperature = current.temperature != null ? Math.round(current.temperature) : "N/A";
            const humidity = current.relativehumidity ?? current.relative_humidity_2m ?? "N/A";
            const windSpeed = current.windspeed != null ? Math.round(current.windspeed) : "N/A";
            const weatherCode = current.weathercode ?? current.weather_code ?? null;

            const condition = getWeatherDescription(weatherCode);

            const embed = createEmbed({ title: `🌎 Погода в ${cityDisplay}, ${country}`, description: condition.description })
                .addFields(
                    {
                        name: "🌡️ Температура",
                        value: `${temperature}°C`,
                        inline: true,
                    },
                    {
                        name: "💧 Влажность",
                        value: `${humidity}%`,
                        inline: true,
                    },
                    {
                        name: "💨 Скорость ветра",
                        value: `${windSpeed} км/ч`,
                        inline: true,
                    },
                )
                .setFooter({
                    text: `Широта: ${latitude.toFixed(2)} | Долгота: ${longitude.toFixed(2)}`,
                });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            logger.info(`Weather command executed`, {
                userId: interaction.user.id,
                city: cityDisplay,
                country: country,
                temperature: temperature,
                guildId: interaction.guildId
            });
        } catch (error) {
            logger.error(`Weather command execution failed`, {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'weather'
            });
            await handleInteractionError(interaction, error, {
                commandName: 'weather',
                source: 'weather_command'
            });
        }
    },
};





function getWeatherDescription(code) {
    if (code >= 0 && code <= 3) {
        return { description: "Clear sky / Partly cloudy ☀️", emoji: "☀️" };
    } else if (code >= 45 && code <= 48) {
        return { description: "Fog and Rime fog 🌫️", emoji: "🌫️" };
    } else if (code >= 51 && code <= 67) {
        return { description: "Drizzle or Rain 🌧️", emoji: "🌧️" };
    } else if (code >= 71 && code <= 75) {
        return { description: "Snow fall ❄️", emoji: "❄️" };
    } else if (code >= 80 && code <= 86) {
        return { description: "Showers (Rain/Snow) 🌨️", emoji: "🌨️" };
    } else if (code >= 95 && code <= 99) {
        return { description: "Thunderstorm ⛈️", emoji: "⛈️" };
    }
    return { description: "Unknown conditions.", emoji: "" };
}



