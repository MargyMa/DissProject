import { SlashCommandBuilder, version, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Просмотр статистики бота"),

  async execute(interaction) {
    try {
      await InteractionHelper.safeDefer(interaction);
      
      const totalGuilds = interaction.client.guilds.cache.size;
      const totalMembers = interaction.client.guilds.cache.reduce(
        (acc, guild) => acc + guild.memberCount,
        0,
      );
      const nodeVersion = process.version;

      const embed = createEmbed({ title: "📊 Системная статистика", description: "Показатели производительности в режиме реального времени." }).addFields(
        { name: "Сервера", value: `${totalGuilds}`, inline: true },
        { name: "Пользователи", value: `${totalMembers}`, inline: true },
        { name: "Node.js", value: `${nodeVersion}`, inline: true },
        { name: "Discord.js", value: `v${version}`, inline: true },
        {
          name: "Использование памяти",
          value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
          inline: true,
        },
      );

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    } catch (error) {
      logger.error('Ошибка команды статистики:', error);
      return InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({ title: 'Системная ошибка', description: 'Не удалось получить системную статистику.', color: 'error' })],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};




