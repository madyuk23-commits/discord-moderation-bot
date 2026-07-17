const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('📨 Отправить личное сообщение пользователю')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь для отправки')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Текст сообщения')
                .setRequired(true)
                .setMaxLength(2000))
        .addBooleanOption(option =>
            option.setName('anonymous')
                .setDescription('Отправить анонимно? (без указания отправителя)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });
        
        const targetUser = interaction.options.getUser('user');
        const messageText = interaction.options.getString('message');
        const anonymous = interaction.options.getBoolean('anonymous') || false;
        
        // Проверка: нельзя отправить сообщение боту
        if (targetUser.id === client.user.id) {
            return interaction.editReply({
                content: '❌ Не могу отправить сообщение самому себе!'
            });
        }
        
        // Проверка: нельзя отправить сообщение себе
        if (targetUser.id === interaction.user.id) {
            return interaction.editReply({
                content: '❌ Вы не можете отправить сообщение самому себе!'
            });
        }
        
        try {
            // Создаем embed для ЛС
            const dmEmbed = new EmbedBuilder()
                .setColor(anonymous ? '#808080' : '#00FF00')
                .setTitle(anonymous ? '📨 Анонимное сообщение' : '📨 Сообщение от модерации')
                .setDescription(messageText)
                .setTimestamp()
                .setFooter({ 
                    text: anonymous ? 'Отправлено анонимно' : `Отправлено: ${interaction.user.tag}`,
                    iconURL: anonymous ? null : interaction.user.displayAvatarURL()
                });
            
            // Добавляем информацию о сервере
            dmEmbed.addFields({
                name: '🌐 Сервер',
                value: interaction.guild.name,
                inline: true
            });
            
            // Отправка сообщения в ЛС
            await targetUser.send({ embeds: [dmEmbed] });
            
            // Успешный ответ в канал
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Сообщение отправлено')
                .setDescription(`Сообщение для **${targetUser.tag}** успешно отправлено`)
                .addFields(
                    { name: '📝 Текст сообщения', value: messageText.substring(0, 500), inline: false },
                    { name: '👤 Получатель', value: targetUser.tag, inline: true },
                    { name: '🔒 Режим', value: anonymous ? 'Анонимно' : 'С указанием отправителя', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${targetUser.id}` });
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Логирование
            await client.logModeration(
                interaction.guild.id,
                'Личное сообщение (DM)',
                targetUser,
                interaction.user,
                messageText,
                { extra: `Анонимно: ${anonymous}` }
            );
            
        } catch (error) {
            console.error('Ошибка отправки DM:', error);
            
            // Обработка ошибок
            let errorMessage = '❌ Не удалось отправить сообщение!';
            
            if (error.code === 50007) {
                errorMessage = '❌ Невозможно отправить сообщение! Пользователь закрыл личные сообщения или не является участником сервера.';
            } else if (error.code === 50001) {
                errorMessage = '❌ Нет доступа к отправке сообщений этому пользователю.';
            } else if (error.code === 10013) {
                errorMessage = '❌ Пользователь не найден. Возможно, он покинул сервер.';
            }
            
            await interaction.editReply({
                content: errorMessage,
                flags: 64
            });
        }
    }
};
