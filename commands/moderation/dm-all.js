const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm-all')
        .setDescription('📢 Отправить массовое сообщение всем участникам сервера')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Текст сообщения для всех')
                .setRequired(true)
                .setMaxLength(2000))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Отправить только определенной роли')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('anonymous')
                .setDescription('Отправить анонимно?')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });
        
        const messageText = interaction.options.getString('message');
        const targetRole = interaction.options.getRole('role');
        const anonymous = interaction.options.getBoolean('anonymous') || false;
        
        // Получаем участников
        let members;
        if (targetRole) {
            members = targetRole.members.filter(m => !m.user.bot);
        } else {
            members = interaction.guild.members.cache.filter(m => !m.user.bot);
        }
        
        if (members.size === 0) {
            return interaction.editReply({
                content: '❌ Нет участников для отправки сообщений!'
            });
        }
        
        // Подтверждение
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Подтверждение массовой рассылки')
            .setDescription(`Вы собираетесь отправить сообщение **${members.size}** участникам${targetRole ? ` с ролью ${targetRole}` : ''}`)
            .addFields(
                { name: '📝 Текст сообщения', value: messageText.substring(0, 500), inline: false }
            )
            .setTimestamp();
        
        await interaction.editReply({ 
            embeds: [confirmEmbed],
            content: '⏳ Отправка сообщений... Пожалуйста, подождите.'
        });
        
        // Отправка
        let successCount = 0;
        let failCount = 0;
        const failedUsers = [];
        
        const dmEmbed = new EmbedBuilder()
            .setColor(anonymous ? '#808080' : '#00FF00')
            .setTitle(anonymous ? '📢 Анонимное сообщение от сервера' : '📢 Сообщение от администрации')
            .setDescription(messageText)
            .addFields(
                { name: '🌐 Сервер', value: interaction.guild.name, inline: true }
            )
            .setTimestamp();
        
        if (!anonymous) {
            dmEmbed.setFooter({ 
                text: `Отправлено: ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });
        }
        
        // Отправляем по 10 сообщений в секунду (чтобы не получить rate limit)
        const batchSize = 10;
        const memberArray = Array.from(members.values());
        
        for (let i = 0; i < memberArray.length; i += batchSize) {
            const batch = memberArray.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (member) => {
                try {
                    await member.send({ embeds: [dmEmbed] });
                    successCount++;
                } catch (error) {
                    failCount++;
                    failedUsers.push(member.user.tag);
                    console.error(`❌ Не удалось отправить DM для ${member.user.tag}:`, error.code);
                }
            }));
            
            // Задержка между батчами
            if (i + batchSize < memberArray.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Результат
        const resultEmbed = new EmbedBuilder()
            .setColor(successCount > 0 ? '#00FF00' : '#FF0000')
            .setTitle('📊 Результат массовой рассылки')
            .addFields(
                { name: '✅ Успешно отправлено', value: successCount.toString(), inline: true },
                { name: '❌ Ошибок', value: failCount.toString(), inline: true },
                { name: '👥 Всего участников', value: members.size.toString(), inline: true }
            )
            .setTimestamp();
        
        if (failedUsers.length > 0 && failedUsers.length <= 10) {
            resultEmbed.addFields({
                name: '⛔ Не получили сообщение',
                value: failedUsers.join('\n'),
                inline: false
            });
        } else if (failedUsers.length > 10) {
            resultEmbed.addFields({
                name: '⛔ Не получили сообщение',
                value: `${failedUsers.length} пользователей (слишком много для отображения)`,
                inline: false
            });
        }
        
        await interaction.editReply({ 
            embeds: [resultEmbed],
            content: null
        });
        
        // Логирование
        await client.logModeration(
            interaction.guild.id,
            'Массовая рассылка (DM All)',
            interaction.user,
            interaction.user,
            `Отправлено ${successCount} сообщений${targetRole ? ` для роли ${targetRole}` : ''}`,
            { extra: `Успешно: ${successCount}, Ошибок: ${failCount}` }
        );
    }
};
