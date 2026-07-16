const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('🔊 Размутить пользователя')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь для размута')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина размута')
                .setRequired(false)
                .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Не указана';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.editReply('❌ Пользователь не найден на сервере!');
        }
        
        if (!member.isCommunicationDisabled()) {
            return interaction.editReply('❌ Этот пользователь не замучен!');
        }
        
        try {
            await member.timeout(null, reason);
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔊 Пользователь размучен')
                .setDescription(`**${user.tag}** был размучен`)
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
                'Размут (Unmute)',
                user,
                interaction.user,
                reason
            );
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Произошла ошибка при размуте пользователя!');
        }
    }
};