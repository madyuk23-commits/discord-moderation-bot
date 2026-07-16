const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const giveawayManager = require('../../utils/giveawayManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-reroll')
        .setDescription('🔄 Перекрутить победителя в розыгрыше')
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
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;
        await interaction.deferReply({ ephemeral });
        
        const messageId = interaction.options.getString('message_id');
        
        const giveaway = await giveawayManager.getGiveaway(messageId);
        if (!giveaway) {
            return interaction.editReply('❌ Розыгрыш с таким ID не найден!');
        }
        
        if (!giveaway.ended) {
            return interaction.editReply('❌ Розыгрыш еще не завершен! Дождитесь окончания.');
        }
        
        if (giveaway.participants.length === 0) {
            return interaction.editReply('❌ В розыгрыше нет участников для перекрутки!');
        }
        
        try {
            const newWinner = await giveawayManager.rerollGiveaway(messageId, client);
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🔄 Перекрутка розыгрыша')
                .setDescription(`**Приз:** ${giveaway.prize}`)
                .addFields(
                    { name: '👑 Новый победитель', value: newWinner, inline: false },
                    { name: '🔄 Перекрутил', value: interaction.user.tag, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID розыгрыша: ${messageId}` });
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Не удалось перекрутить розыгрыш!');
        }
    }
};