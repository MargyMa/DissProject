import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
const SUPPORT_SERVER_URL = "https://discord.gg/TYZAPe8y6J";
export default {
    data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Получить ссылку на сервер поддержки"),

  async execute(interaction) {
    try {
      const supportButton = new ButtonBuilder()
        .setLabel("Присоединяйтесь к серверу поддержки")
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_SERVER_URL);

      const actionRow = new ActionRowBuilder().addComponents(supportButton);

      await InteractionHelper.safeReply(interaction, {
        embeds: [
          createEmbed({ title: "🚑 Нужна помощь?", description: "Обратитесь за помощью к нашему официальному серверу поддержки, сообщите об ошибках или предложите новые функции." }),
        ],
        components: [actionRow],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error('Support command error:', error);
      
      try {
        return await InteractionHelper.safeReply(interaction, {
          embeds: [createEmbed({ title: 'Системная ошибка', description: 'Не удалось отобразить информацию о поддержке.', color: 'error' })],
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Не удалось отправить ответ с ошибкой:', replyError);
      }
    }
  },
};





