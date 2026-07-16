const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Забанить пользователя')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь для бана')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина бана')
                .setRequired(false)
                .setMaxLength(500))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Удалить сообщения за последние X дней (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .addBooleanOption(option =>
            option.setName('dm')
                .setDescription('Отправить уведомление в ЛС')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Не указана';
        const days = interaction.options.getInteger('days') || 0;
        const sendDM = interaction.options.getBoolean('dm') ?? true;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (user.id === interaction.user.id) {
            return interaction.editReply('❌ Вы не можете забанить самого себя!');
        }
        
        if (user.id === client.user.id) {
            return interaction.editReply('❌ Вы не можете забанить бота!');
        }
        
        if (member) {
            if (!member.bannable) {
                return interaction.editReply('❌ Невозможно забанить этого пользователя!');
            }
            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.editReply('❌ Вы не можете забанить пользователя с более высокой или такой же ролью!');
            }
        }
        
        try {
            await interaction.guild.members.ban(user.id, { reason, days });
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('✅ Пользователь забанен')
                .setDescription(`**${user.tag}** был забанен`)
                .addFields(
                    { name: '📝 Причина', value: reason, inline: false },
                    { name: '🗑️ Удалено сообщений за', value: `${days} дней`, inline: true },
                    { name: '🛡️ Модератор', value: interaction.user.tag, inline: true },
                    { name: '📅 Дата', value: new Date().toLocaleString('ru-RU'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${user.id}`, iconURL: user.displayAvatarURL() });
            
            await interaction.editReply({ embeds: [embed] });
            
            await client.logModeration(
                interaction.guild.id,
                'Бан (Ban)',
                user,
                interaction.user,
                reason,
                { extra: `Удалено сообщений за: ${days} дней` }
            );
            
            if (sendDM) {
                try {
                    await user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('🔨 Вы были забанены')
                                .setDescription(`**Сервер:** ${interaction.guild.name}`)
                                .addFields(
                                    { name: '📝 Причина', value: reason, inline: false },
                                    { name: '🛡️ Модератор', value: interaction.user.tag, inline: true },
                                    { name: '⏱️ Длительность', value: 'Постоянный бан', inline: true }
                                )
                                .setTimestamp()
                        ]
                    });
                } catch (error) {}
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Произошла ошибка при бане пользователя!');
        }
    }
};