const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const warningsPath = path.join(__dirname, '../../data/warnings.json');

function loadWarnings() {
    try {
        if (!fs.existsSync(warningsPath)) {
            fs.mkdirSync(path.dirname(warningsPath), { recursive: true });
            fs.writeFileSync(warningsPath, JSON.stringify({}, null, 2));
            return {};
        }
        return JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
    } catch (error) {
        console.error('Ошибка загрузки предупреждений:', error);
        return {};
    }
}

function saveWarnings(warnings) {
    try {
        fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения предупреждений:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Выдать предупреждение пользователю')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь для предупреждения')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина предупреждения')
                .setRequired(true)
                .setMaxLength(500))
        .addBooleanOption(option =>
            option.setName('dm')
                .setDescription('Отправить уведомление в ЛС')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Показать только вам')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
        await interaction.deferReply({ ephemeral });
        
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const sendDM = interaction.options.getBoolean('dm') ?? true;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (user.id === interaction.user.id) {
            return interaction.editReply('❌ Вы не можете выдать предупреждение самому себе!');
        }
        
        if (user.id === client.user.id) {
            return interaction.editReply('❌ Вы не можете выдать предупреждение боту!');
        }
        
        if (member && member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply('❌ Вы не можете выдать предупреждение пользователю с более высокой или такой же ролью!');
        }
        
        const warnings = loadWarnings();
        const guildId = interaction.guild.id;
        const userId = user.id;
        
        if (!warnings[guildId]) warnings[guildId] = {};
        if (!warnings[guildId][userId]) warnings[guildId][userId] = [];
        
        const warning = {
            id: Date.now().toString(),
            reason: reason,
            moderator: interaction.user.id,
            moderatorName: interaction.user.tag,
            date: new Date().toISOString(),
            dateString: new Date().toLocaleString('ru-RU')
        };
        
        warnings[guildId][userId].push(warning);
        saveWarnings(warnings);
        
        const totalWarnings = warnings[guildId][userId].length;
        
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Предупреждение')
            .setDescription(`Пользователь **${user.tag}** получил предупреждение`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '📝 Причина', value: reason, inline: false },
                { name: '🛡️ Модератор', value: interaction.user.tag, inline: true },
                { name: '📊 Всего предупреждений', value: totalWarnings.toString(), inline: true },
                { name: '📅 Дата', value: warning.dateString, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `ID предупреждения: ${warning.id}` });
        
        await interaction.editReply({ embeds: [embed] });
        
        await client.logModeration(
            interaction.guild.id,
            'Предупреждение (Warn)',
            user,
            interaction.user,
            reason,
            { extra: `Всего предупреждений: ${totalWarnings}` }
        );
        
        if (sendDM) {
            try {
                await user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FFA500')
                            .setTitle('⚠️ Вы получили предупреждение')
                            .setDescription(`**Сервер:** ${interaction.guild.name}`)
                            .addFields(
                                { name: '📝 Причина', value: reason, inline: false },
                                { name: '🛡️ Модератор', value: interaction.user.tag, inline: true },
                                { name: '📊 Всего предупреждений', value: totalWarnings.toString(), inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: `ID предупреждения: ${warning.id}` })
                    ]
                });
            } catch (error) {}
        }
    }
};