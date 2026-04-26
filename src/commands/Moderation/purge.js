import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { checkRateLimit } from '../../utils/rateLimiter.js';
import { getColor } from '../../config/bot.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Удалить определенное количество сообщений")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Количество сообщений (1-100)")
        .setRequired(true),
    )
.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  category: "moderation",

  async execute(interaction, config, client) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) {
      logger.warn(`Не удалось выполнить очистку при отсрочке взаимодействия`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'purge'
      });
      return;
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          errorEmbed(
            "В разрешении отказано",
            "Вам нужен `Управление сообщениями` разрешение на удаление сообщений.",
          ),
        ],
      });

    const amount = interaction.options.getInteger("amount");
    const channel = interaction.channel;

    if (amount < 1 || amount > 100)
      return await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          errorEmbed(
            "Invalid Amount",
            "Пожалуйста, укажите число между 1 и 100.",
          ),
        ],
      });

    try {
      
      const rateLimitKey = `purge_${interaction.user.id}`;
      const isAllowed = await checkRateLimit(rateLimitKey, 5, 60000);
      if (!isAllowed) {
        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            warningEmbed(
              "Вы слишком быстро очищаете сообщения. Пожалуйста, подождите минуту, прежде чем повторить попытку.",
              "⏳ Ставка ограничена"
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const fetched = await channel.messages.fetch({ limit: amount });
      const deleted = await channel.bulkDelete(fetched, true);
      const deletedCount = deleted.size;

      const purgeEmbed = createEmbed(
        "🗑️ Сообщения удалены (Журнал действий)",
        `${deletedCount} сообщения были удалены пользователем ${interaction.user}.`,
      )
.setColor(getColor('moderation'))
        .addFields(
          { name: "Канал", value: channel.toString(), inline: true },
          {
            name: "Модератор",
            value: `${interaction.user.tag} (${interaction.user.id})`,
            inline: true,
          },
          { name: "Рассчитывать", value: `${deletedCount} сообщения`, inline: false },
        );

      await logEvent({
        client,
        guild: interaction.guild,
        event: {
          action: "Сообщения удалены",
          target: `${channel} (${deletedCount} сообщения)`,
          executor: `${interaction.user.tag} (${interaction.user.id})`,
          reason: `Удаленные ${deletedCount} сообщения`,
          metadata: {
            channelId: channel.id,
            messageCount: deletedCount,
            requestedAmount: amount,
            moderatorId: interaction.user.id
          }
        }
      });

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(`🗑️ Удаленный ${deletedCount} сообщения в ${channel}.`),
        ],
flags: MessageFlags.Ephemeral,
      });

      setTimeout(() => {
        interaction.deleteReply().catch(err => 
          logger.debug('Failed to auto-delete purge response:', err)
        );
      }, 3000);
    } catch (error) {
      logger.error('Purge command error:', error);
      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          errorEmbed(
            "Произошла непредвиденная ошибка при удалении сообщения. Примечание: сообщения, отправленные более 14 дней назад, не могут быть удалены массово.",
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
};



