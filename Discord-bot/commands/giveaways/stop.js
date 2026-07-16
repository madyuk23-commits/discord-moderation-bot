const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const giveawayManager = require('../../utils/giveawayManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-stop')
        .setDescription('⏹️ Досрочно остановить розыгрыш')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID сообщения с розыгрышем')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Показать только вам')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
        await interaction.deferReply({ ephemeral });
        
        const messageId = interaction.options.getString('message_id');
        
        const giveaway = await giveawayManager.getGiveaway(messageId);
        if (!giveaway) {
            return interaction.editReply('❌ Розыгрыш с таким ID не найден!');
        }
        
        if (giveaway.ended) {
            return interaction.editReply('❌ Розыгрыш уже завершен!');
        }
        
        try {
            await giveawayManager.endGiveaway(messageId, client, true);
            
            const embed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('⏹️ Розыгрыш остановлен досрочно')
                .setDescription(`**Приз:** ${giveaway.prize}`)
                .addFields(
                    { name: '🛑 Остановил', value: interaction.user.tag, inline: true },
                    { name: '📅 Дата', value: new Date().toLocaleString('ru-RU'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID розыгрыша: ${messageId}` });
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Не удалось остановить розыгрыш!');
        }
    }
};