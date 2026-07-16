const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Показать список всех команд')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Название команды для подробной информации')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Показать только вам')
                .setRequired(false)),
    
    async execute(interaction, client) {
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
        const commandName = interaction.options.getString('command');
        
        if (commandName) {
            // Поиск конкретной команды
            const command = client.commands.get(commandName);
            if (!command) {
                return interaction.reply({
                    content: `❌ Команда "${commandName}" не найдена!`,
                    ephemeral: true
                });
            }
            
            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`📖 Команда: ${command.data.name}`)
                .setDescription(command.data.description || 'Нет описания')
                .addFields(
                    { name: '📝 Использование', value: `/${command.data.name}`, inline: true }
                )
                .setTimestamp();
            
            if (command.data.options && command.data.options.length > 0) {
                const options = command.data.options.map(opt => 
                    `\`${opt.name}\` - ${opt.description}${opt.required ? ' (Обязательно)' : ' (Опционально)'}`
                ).join('\n');
                embed.addFields({ name: '📌 Параметры', value: options || 'Нет параметров', inline: false });
            }
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral });
        
        // Общий список команд
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📚 Список команд')
            .setDescription('Выберите категорию в меню ниже или используйте `/help [команда]` для деталей')
            .setTimestamp()
            .setFooter({ text: `Запросил: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_select')
                    .setPlaceholder('Выберите категорию')
                    .addOptions([
                        {
                            label: '🛠️ Модерация',
                            description: 'Команды для модерации сервера',
                            value: 'moderation'
                        },
                        {
                            label: '🎉 Розыгрыши',
                            description: 'Команды для создания и управления розыгрышами',
                            value: 'giveaways'
                        },
                        {
                            label: 'ℹ️ Информация',
                            description: 'Информационные команды',
                            value: 'utility'
                        }
                    ])
            );
        
        await interaction.editReply({ 
            embeds: [embed], 
            components: [row]
        });
        
        // Обработка выбора категории
        const filter = i => i.customId === 'help_select' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ 
            filter, 
            time: 60000,
            max: 1
        });
        
        collector.on('collect', async i => {
            const category = i.values[0];
            let categoryCommands = [];
            let categoryEmoji = '';
            let categoryName = '';
            
            if (category === 'moderation') {
                categoryCommands = ['kick', 'ban', 'warn', 'warnings', 'clear', 'mute', 'unmute'];
                categoryEmoji = '🛠️';
                categoryName = 'Модерация';
            } else if (category === 'giveaways') {
                categoryCommands = ['giveaway-start', 'giveaway-end', 'giveaway-reroll', 'giveaway-stop', 'giveaway-list'];
                categoryEmoji = '🎉';
                categoryName = 'Розыгрыши';
            } else {
                categoryCommands = ['ping', 'help'];
                categoryEmoji = 'ℹ️';
                categoryName = 'Информация';
            }
            
            const embed2 = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`${categoryEmoji} Команды категории "${categoryName}"`)
                .setDescription('Используйте `/help [команда]` для подробной информации')
                .setTimestamp();
            
            for (const cmdName of categoryCommands) {
                const cmd = client.commands.get(cmdName);
                if (cmd && cmd.data) {
                    embed2.addFields({
                        name: `/${cmdName}`,
                        value: cmd.data.description || 'Нет описания',
                        inline: false
                    });
                }
            }
            
            await i.update({ embeds: [embed2], components: [] });
        });
    }
};