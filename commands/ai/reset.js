const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const contextManager = require('../../ai/contextManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-reset')
        .setDescription('🔄 Сбросить контекст общения ИИ')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для сброса')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        
        if (user) {
            const reset = contextManager.resetUser(user.id);
            
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔄 Сброс контекста')
                .setDescription(reset ? 
                    `Контекст для ${user.tag} был сброшен` : 
                    `У ${user.tag} нет сохраненного контекста`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } else {
            // Сброс для всех пользователей
            contextManager.memory.users = {};
            contextManager.saveMemory();
            
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔄 Сброс контекста')
                .setDescription('Контекст для всех пользователей был сброшен')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
    }
};