const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const contextManager = require('../../ai/contextManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-stats')
        .setDescription('📊 Статистика ИИ-системы'),
    
    async execute(interaction) {
        const stats = contextManager.getStats();
        
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Статистика ИИ')
            .addFields(
                { name: '👥 Всего пользователей', value: stats.totalUsers.toString(), inline: true },
                { name: '💬 Всего сообщений', value: stats.totalMessages.toString(), inline: true },
                { name: '🟢 Активных (1 час)', value: stats.activeUsers.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '🤖 Статистика ИИ-системы' });
        
        await interaction.reply({ embeds: [embed] });
    }
};