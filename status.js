const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const contextManager = require('../../ai/contextManager');
const toggle = require('./toggle');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-status')
        .setDescription('📊 Статус ИИ-системы'),
    
    async execute(interaction) {
        const stats = contextManager.getStats();
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🤖 Статус ИИ-системы')
            .addFields(
                { name: '⚙️ Состояние', value: toggle.isEnabled() ? '✅ Включен' : '❌ Выключен', inline: true },
                { name: '👥 Всего пользователей', value: stats.totalUsers.toString(), inline: true },
                { name: '💬 Всего сообщений', value: stats.totalMessages.toString(), inline: true },
                { name: '🟢 Активных (последний час)', value: stats.activeUsers.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '🤖 Жесткий ИИ-бот', iconURL: interaction.client.user.displayAvatarURL() });
        
        await interaction.reply({ embeds: [embed] });
    }
};