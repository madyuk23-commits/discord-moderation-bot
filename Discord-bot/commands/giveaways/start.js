const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');
const giveawayManager = require('../../utils/giveawayManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-start')
        .setDescription('🎉 Начать новый розыгрыш')
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('Приз розыгрыша')
                .setRequired(true)
                .setMaxLength(100))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Длительность (например: 10m, 1h, 1d)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Количество победителей')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Требуемая роль для участия')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Дополнительное описание розыгрыша')
                .setRequired(false)
                .setMaxLength(500))
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Показать только вам')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    
    async execute(interaction, client) {
        const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
        await interaction.deferReply({ ephemeral });
        
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getString('duration');
        const winners = interaction.options.getInteger('winners');
        const requiredRole = interaction.options.getRole('role');
        const description = interaction.options.getString('description') || '🎉 Нажмите на кнопку ниже, чтобы участвовать!';
        
        const msDuration = ms(duration);
        if (!msDuration) {
            return interaction.editReply('❌ Укажите корректную длительность (например: 10m, 1h, 1d)');
        }
        
        if (msDuration < 60000) {
            return interaction.editReply('❌ Минимальная длительность розыгрыша - 1 минута!');
        }
        
        if (msDuration > 604800000) {
            return interaction.editReply('❌ Максимальная длительность розыгрыша - 7 дней!');
        }
        
        const endTime = Date.now() + msDuration;
        const uniqueId = Date.now().toString();
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎉 НОВЫЙ РОЗЫГРЫШ!')
            .setDescription(`**Приз:** ${prize}\n**Победителей:** ${winners}\n**Длительность:** ${duration}`)
            .addFields(
                { name: '📝 Описание', value: description, inline: false },
                { name: '⏰ Окончание', value: `<t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:F>)`, inline: false }
            )
            .setTimestamp(endTime)
            .setFooter({ text: `Организатор: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        if (requiredRole) {
            embed.addFields({ name: '🔒 Требуемая роль', value: `${requiredRole}`, inline: true });
        }
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_join_${uniqueId}`)
                    .setLabel('🎉 Участвовать')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎉')
            );
        
        const message = await interaction.channel.send({ 
            embeds: [embed], 
            components: [row]
        });
        
        const giveaway = await giveawayManager.createGiveaway(
            interaction.guild.id,
            interaction.channel.id,
            message.id,
            prize,
            msDuration,
            endTime,
            winners,
            interaction.user.id,
            requiredRole ? requiredRole.id : null,
            description
        );
        
        await giveawayManager.saveGiveaway(giveaway);
        
        await interaction.editReply({
            content: `✅ Розыгрыш создан! ID: \`${message.id}\``,
            ephemeral: true
        });
        
        // Обработка нажатий на кнопку
        const collector = message.createMessageComponentCollector({
            filter: i => i.customId === `giveaway_join_${uniqueId}` && i.message.id === message.id,
            time: msDuration
        });
        
        collector.on('collect', async i => {
            if (i.user.bot) return;
            
            if (requiredRole) {
                const member = await i.guild.members.fetch(i.user.id);
                if (!member.roles.cache.has(requiredRole.id)) {
                    return i.reply({
                        content: `❌ Для участия в розыгрыше требуется роль ${requiredRole}`,
                        ephemeral: true
                    });
                }
            }
            
            if (giveaway.participants.includes(i.user.id)) {
                return i.reply({
                    content: '❌ Вы уже участвуете в этом розыгрыше!',
                    ephemeral: true
                });
            }
            
            giveaway.participants.push(i.user.id);
            await giveawayManager.saveGiveaway(giveaway);
            
            await i.reply({
                content: '✅ Вы успешно участвуете в розыгрыше! Удачи! 🍀',
                ephemeral: true
            });
        });
        
        setTimeout(async () => {
            await giveawayManager.endGiveaway(message.id, client);
        }, msDuration);
    }
};