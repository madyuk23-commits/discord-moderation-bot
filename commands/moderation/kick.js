const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('🔨 Выгнать пользователя с сервера')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь для выгона')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина выгона')
                .setRequired(false)
                .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Не указана';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.editReply('❌ Пользователь не найден на сервере!');
        }
        
        if (user.id === interaction.user.id) {
            return interaction.editReply('❌ Вы не можете выгнать самого себя!');
        }
        
        if (user.id === client.user.id) {
            return interaction.editReply('❌ Вы не можете выгнать бота!');
        }
        
        if (!member.kickable) {
            return interaction.editReply('❌ Невозможно выгнать этого пользователя! У него выше или такие же права как у меня.');
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply('❌ Вы не можете выгнать пользователя с более высокой или такой же ролью!');
        }
        
        try {
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('✅ Пользователь выгнан')
                .setDescription(`**${user.tag}** был выгнан с сервера`)
                .addFields(
                    { name: '📝 Причина', value: reason, inline: false },
                    { name: '🛡️ Модератор', value: interaction.user.tag, inline: true },
                    { name: '📅 Дата', value: new Date().toLocaleString('ru-RU'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${user.id}`, iconURL: user.displayAvatarURL() });
            
            await interaction.editReply({ embeds: [embed] });
            
            await client.logModeration(
                interaction.guild.id,
                'Выгон (Kick)',
                user,
                interaction.user,
                reason
            );
            
            try {
                await user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF4444')
                            .setTitle('🔨 Вы были выгнаны с сервера')
                            .setDescription(`**Сервер:** ${interaction.guild.name}`)
                            .addFields(
                                { name: '📝 Причина', value: reason, inline: false },
                                { name: '🛡️ Модератор', value: interaction.user.tag, inline: true }
                            )
                            .setTimestamp()
                    ]
                });
            } catch (error) {}
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Произошла ошибка при выгоне пользователя!');
        }
    }
};