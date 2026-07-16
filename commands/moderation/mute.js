const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('🔇 Замутить пользователя')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь для мута')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Длительность мута (например: 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина мута')
                .setRequired(false)
                .setMaxLength(500))
        .addBooleanOption(option =>
            option.setName('dm')
                .setDescription('Отправить уведомление в ЛС')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'Не указана';
        const sendDM = interaction.options.getBoolean('dm') ?? true;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.editReply('❌ Пользователь не найден на сервере!');
        }
        
        if (user.id === interaction.user.id) {
            return interaction.editReply('❌ Вы не можете замутить самого себя!');
        }
        
        if (user.id === client.user.id) {
            return interaction.editReply('❌ Вы не можете замутить бота!');
        }
        
        if (!member.moderatable) {
            return interaction.editReply('❌ Невозможно замутить этого пользователя!');
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply('❌ Вы не можете замутить пользователя с более высокой или такой же ролью!');
        }
        
        const msDuration = ms(duration);
        if (!msDuration) {
            return interaction.editReply('❌ Укажите корректную длительность (например: 10m, 1h, 1d)');
        }
        
        if (msDuration > 2419200000) {
            return interaction.editReply('❌ Максимальная длительность мута - 28 дней!');
        }
        
        if (msDuration < 60000) {
            return interaction.editReply('❌ Минимальная длительность мута - 1 минута!');
        }
        
        try {
            await member.timeout(msDuration, reason);
            
            const embed = new EmbedBuilder()
                .setColor('#FF8C00')
                .setTitle('🔇 Пользователь замучен')
                .setDescription(`**${user.tag}** был замучен`)
                .addFields(
                    { name: '⏱️ Длительность', value: duration, inline: true },
                    { name: '📝 Причина', value: reason, inline: true },
                    { name: '🛡️ Модератор', value: interaction.user.tag, inline: true },
                    { name: '📅 Дата', value: new Date().toLocaleString('ru-RU'), inline: true },
                    { name: '⏰ Окончание', value: `<t:${Math.floor((Date.now() + msDuration) / 1000)}:R>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${user.id}`, iconURL: user.displayAvatarURL() });
            
            await interaction.editReply({ embeds: [embed] });
            
            await client.logModeration(
                interaction.guild.id,
                'Мут (Mute)',
                user,
                interaction.user,
                reason,
                { extra: `Длительность: ${duration}` }
            );
            
            if (sendDM) {
                try {
                    await user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF8C00')
                                .setTitle('🔇 Вы были замучены')
                                .setDescription(`**Сервер:** ${interaction.guild.name}`)
                                .addFields(
                                    { name: '⏱️ Длительность', value: duration, inline: true },
                                    { name: '📝 Причина', value: reason, inline: true },
                                    { name: '🛡️ Модератор', value: interaction.user.tag, inline: true },
                                    { name: '⏰ Окончание', value: `<t:${Math.floor((Date.now() + msDuration) / 1000)}:R>`, inline: true }
                                )
                                .setTimestamp()
                        ]
                    });
                } catch (error) {}
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Произошла ошибка при муте пользователя!');
        }
    }
};
