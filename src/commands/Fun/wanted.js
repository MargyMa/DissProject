import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { sanitizeInput } from '../../utils/sanitization.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("wanted")
    .setDescription("Создайте плакат «Разыскивается» для пользователя.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Пользователь, который находится в розыске.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("crime")
        .setDescription("Преступление, которое они совершили.")
        .setRequired(false)
        .setMaxLength(100),
    ),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      await InteractionHelper.safeDefer(interaction);

      const targetUser = interaction.options.getUser("user");
      const crimeRaw = interaction.options.getString("crime");

      
      let crime = "Слишком очаровательна для этого официанта.";
      if (crimeRaw) {
        const sanitizedCrime = sanitizeInput(crimeRaw.trim(), 100);
        if (sanitizedCrime.length > 0) {
          crime = sanitizedCrime;
        }
      }

      
      if (!targetUser) {
        throw new TitanBotError(
          'Целевой пользователь не найден для команды wanted',
          ErrorTypes.USER_INPUT,
          'Не удалось найти указанного пользователя.'
        );
      }

      const bountyAmount = Math.floor(
        Math.random() * (100000000 - 1000000) + 1000000,
      );
      const bounty = `$${bountyAmount.toLocaleString()} USD`;

      const embed = createEmbed({
        color: 'primary',
        title: '💥 БОЛЬШОЕ ВОЗНАГРАЖДЕНИЕ: В ПОИСКАХ! 💥',
        description: `**Преступный:** ${targetUser.tag}\n**Преступление:** ${crime}`,
        fields: [
          {
            name: "ЖИВОЙ ИЛИ МЕРТВЫЙ",
            value: `**Вознаграждение:** ${bounty}`,
            inline: false,
          },
        ],
        image: {
          url: targetUser.displayAvatarURL({ size: 1024, extension: 'png' }),
        },
        footer: {
          text: `Последний раз его видели в ${interaction.guild.name}`,
        },
      });

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      logger.debug(`Требуемая команда, выполняемая пользователем ${interaction.user.id} для ${targetUser.id} в гильдии ${interaction.guildId}`);
    } catch (error) {
      logger.error('Требуемая ошибка команды:', error);
      await handleInteractionError(interaction, error, {
        commandName: 'wanted',
        source: 'wanted_command'
      });
    }
  },
};



