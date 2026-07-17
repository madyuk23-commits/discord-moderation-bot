const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

let aiEnabled = true;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-toggle')
        .setDescription('🤖 Включить/выключить ИИ-общение')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Включить ИИ?')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const enabled = interaction.options.getBoolean('enabled');
        aiEnabled = enabled;
        
        const embed = new EmbedBuilder()
            .setColor(enabled ? '#00FF00' : '#FF0000')
            .setTitle('🤖 Управление ИИ')
            .setDescription(`ИИ-общение ${enabled ? '✅ ВКЛЮЧЕНО' : '❌ ВЫКЛЮЧЕНО'}`)
            .addFields(
                { name: '🛡️ Изменил', value: interaction.user.tag, inline: true },
                { name: '📅 Дата', value: new Date().toLocaleString('ru-RU'), inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    isEnabled() {
        return aiEnabled;
    }
};