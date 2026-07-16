const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const giveawayManager = require('../../utils/giveawayManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-list')
        .setDescription('📋 Показать активные розыгрыши')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Показать только вам')
                .setRequired(false))
        .setDMPermission(false),
    
    async execute(interaction, client) {
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
        await interaction.deferReply({ ephemeral });
        
        const giveaways = await giveawayManager.getActiveGiveaways(interaction.guild.id);
        
        if (giveaways.length === 0) {
            return interaction.editReply('❌ Активных розыгрышей на сервере нет.');
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎉 Активные розыгрыши')
            .setDescription(`Всего активных розыгрышей: ${giveaways.length}`)
            .setTimestamp()
            .setFooter({ text: `Запросил: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        giveaways.forEach((g, index) => {
            const participants = g.participants ? g.participants.length : 0;
            embed.addFields({
                name: `${index + 1}. ${g.prize}`,
                value: `ID: \`${g.messageId}\`\n` +
                       `👥 Участников: ${participants}\n` +
                       `👑 Победителей: ${g.winnersCount}\n` +
                       `⏰ Окончание: <t:${Math.floor(g.endTime / 1000)}:R>`,
                inline: false
            });
        });
        
        await interaction.editReply({ embeds: [embed] });
    }
};