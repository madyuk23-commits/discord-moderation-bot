const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const warningsPath = path.join(__dirname, '../../data/warnings.json');

function loadWarnings() {
    try {
        if (!fs.existsSync(warningsPath)) return {};
        return JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
    } catch (error) {
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('📋 Показать предупреждения пользователя')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь для просмотра')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Показать только вам')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
        await interaction.deferReply({ ephemeral });
        
        const user = interaction.options.getUser('user');
        const warnings = loadWarnings();
        const guildId = interaction.guild.id;
        const userId = user.id;
        
        const userWarnings = warnings[guildId]?.[userId] || [];
        
        if (userWarnings.length === 0) {
            return interaction.editReply(`✅ У пользователя **${user.tag}** нет предупреждений.`);
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`📋 Предупреждения пользователя ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`Всего предупреждений: **${userWarnings.length}**`)
            .setTimestamp()
            .setFooter({ text: `ID: ${user.id}` });
        
        userWarnings.slice(-10).forEach((w, index) => {
            embed.addFields({
                name: `#${userWarnings.length - userWarnings.slice(-10).length + index + 1}`,
                value: `**Причина:** ${w.reason}\n**Модератор:** ${w.moderatorName}\n**Дата:** ${w.dateString}`,
                inline: false
            });
        });
        
        if (userWarnings.length > 10) {
            embed.setFooter({ text: `Показаны последние 10 из ${userWarnings.length} предупреждений` });
        }
        
        await interaction.editReply({ embeds: [embed] });
    }
};