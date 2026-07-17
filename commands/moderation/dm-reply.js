const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm-reply')
        .setDescription('💬 Ответить в личные сообщения пользователю')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('ID пользователя для ответа')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Текст ответа')
                .setRequired(true)
                .setMaxLength(2000))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });
        
        const userId = interaction.options.getString('user_id');
        const messageText = interaction.options.getString('message');
        
        try {
            const targetUser = await client.users.fetch(userId);
            
            const dmEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('💬 Ответ от модерации')
                .setDescription(messageText)
                .addFields(
                    { name: '🌐 Сервер', value: interaction.guild.name, inline: true },
                    { name: '🛡️ Модератор', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();
            
            await targetUser.send({ embeds: [dmEmbed] });
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Ответ отправлен')
                .setDescription(`Сообщение отправлено пользователю **${targetUser.tag}**`)
                .addFields(
                    { name: '📝 Текст ответа', value: messageText.substring(0, 500), inline: false }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
            await client.logModeration(
                interaction.guild.id,
                'Ответ в ЛС (DM Reply)',
                targetUser,
                interaction.user,
                messageText
            );
            
        } catch (error) {
            console.error('Ошибка отправки ответа:', error);
            
            let errorMessage = '❌ Не удалось отправить ответ!';
            if (error.code === 50007) {
                errorMessage = '❌ Пользователь закрыл личные сообщения!';
            } else if (error.code === 10013) {
                errorMessage = '❌ Пользователь с таким ID не найден!';
            }
            
            await interaction.editReply({
                content: errorMessage,
                flags: 64
            });
        }
    }
};
