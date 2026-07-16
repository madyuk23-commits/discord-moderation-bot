const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Проверить задержку бота')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Показать только вам')
                .setRequired(false)),
    
    async execute(interaction, client) {
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;
        await interaction.deferReply({ ephemeral });
        
        const sent = await interaction.editReply({
            content: '🏓 Измерение задержки...',
            fetchReply: true
        });
        
        const ping = sent.createdTimestamp - interaction.createdTimestamp;
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📡 Задержка бота', value: `${ping}ms`, inline: true },
                { name: '💓 API Discord', value: `${client.ws.ping}ms`, inline: true },
                { name: '🔄 Статус', value: client.isReady ? '🟢 Онлайн' : '🟡 Загрузка...', inline: true },
                { name: '📊 Серверов', value: client.guilds.cache.size.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Команда от: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        await interaction.editReply({ content: null, embeds: [embed] });
    }
};