import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Получите подробную информацию о пользователе")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("Пользователь для проверки (по умолчанию используется вами)"),
    ),

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction);
      if (!deferSuccess) {
        logger.warn(`Не удалось выполнить отсрочку взаимодействия с пользовательской информацией`, {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          commandName: 'userinfo'
        });
        return;
      }

      const user = interaction.options.getUser("target") || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);

      const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);
      const joinedTimestamp = member?.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;

      const embed = createEmbed({ title: `👤 Информация о пользователе: ${user.username}` })
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "Идентификатор", value: user.id, inline: true },
          { name: "Бот", value: user.bot ? "Да" : "Нет", inline: true },
          {
            name: "Роли",
            value:
              member && member.roles.cache.size > 1
                ? member.roles.cache
                    .map((r) => r.name)
                    .slice(0, 5)
                    .join(", ")
                : "None",
            inline: true,
          },
          {
            name: "Созданная учетная запись",
            value: `<t:${createdTimestamp}:R>`,
            inline: false,
          },
          {
            name: "Присоединенный сервер",
            value: joinedTimestamp ? `<t:${joinedTimestamp}:R>` : "Не на сервере",
            inline: false,
          },
          {
            name: "Высшая роль",
            value: member?.roles?.highest?.name || "Никто",
            inline: true,
          },
        );

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      logger.info(`UserInfo command executed`, {
        userId: interaction.user.id,
        targetUserId: user.id,
        guildId: interaction.guildId
      });
    } catch (error) {
      logger.error(`UserInfo command execution failed`, {
        error: error.message,
        stack: error.stack,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'userinfo'
      });
      await handleInteractionError(interaction, error, {
        commandName: 'userinfo',
        source: 'userinfo_command'
      });
    }
  },
};




