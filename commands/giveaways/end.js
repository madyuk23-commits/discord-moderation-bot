const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const giveawayManager = require('../../utils/giveawayManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-end')
        .setDescription('🏁 Принудительно завершить розыгрыш с выбором победителей')
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
            await giveawayManager.endGiveaway(messageId, client, false);
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏁 Розыгрыш завершен')
                .setDescription(`**Приз:** ${giveaway.prize}`)
                .addFields(
                    { name: '🛡️ Завершил', value: interaction.user.tag, inline: true },
                    { name: '📅 Дата', value: new Date().toLocaleString('ru-RU'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID розыгрыша: ${messageId}` });
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Не удалось завершить розыгрыш!');
        }
    }
};