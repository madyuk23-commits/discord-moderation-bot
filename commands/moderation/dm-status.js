const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm-status')
        .setDescription('🔍 Проверить, открыты ли личные сообщения у пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для проверки')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });
        
        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!member) {
            return interaction.editReply('❌ Пользователь не найден на сервере!');
        }
        
        // Пытаемся отправить тестовое сообщение
        let dmStatus = '🔒 Закрыты';
        let statusColor = '#FF0000';
        let details = 'Пользователь не разрешает личные сообщения от участников сервера.';
        
        try {
            const testEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔍 Тестовое сообщение')
                .setDescription('Это тестовое сообщение для проверки статуса DM.')
                .setTimestamp()
                .setFooter({ text: 'Проверка статуса DM' });
            
            await targetUser.send({ embeds: [testEmbed] });
            
            dmStatus = '✅ Открыты';
            statusColor = '#00FF00';
            details = 'Пользователь может получать личные сообщения.';
        } catch (error) {
            if (error.code === 50007) {
                details = 'Пользователь закрыл личные сообщения или не является участником сервера.';
            } else if (error.code === 50001) {
                details = 'Нет доступа к отправке сообщений этому пользователю.';
            } else {
                details = `Ошибка: ${error.message}`;
            }
        }
        
        const embed = new EmbedBuilder()
            .setColor(statusColor)
            .setTitle('🔍 Статус личных сообщений')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '👤 Пользователь', value: targetUser.tag, inline: true },
                { name: '📊 Статус DM', value: dmStatus, inline: true },
                { name: '📝 Детали', value: details, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `ID: ${targetUser.id}` });
        
        await interaction.editReply({ embeds: [embed] });
    }
};
