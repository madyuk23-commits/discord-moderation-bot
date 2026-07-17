const { EmbedBuilder } = require('discord.js');
const responseGenerator = require('../ai/responses');
const contextManager = require('../ai/contextManager');
const filter = require('../ai/filter');
const toggle = require('../commands/ai/toggle');

// Анти-спам система
const spamMap = new Map();
const MAX_MESSAGES = 5;
const TIME_WINDOW = 5000;
const MUTE_DURATION = 600000; // 10 минут

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Игнорируем сообщения ботов
        if (message.author.bot) return;
        if (!message.guild) return;
        
        // Проверка на включенный ИИ
        if (!toggle.isEnabled()) {
            // Если ИИ выключен, используем только модерацию
            await this.handleAntiSpam(message, client);
            return;
        }
        
        // 1. Сначала фильтрация сообщения
        const filterResult = filter.filter(message);
        
        if (!filterResult.allowed) {
            if (filterResult.action === 'delete') {
                await message.delete();
                await message.channel.send(`❌ ${filterResult.reason}`);
            } else if (filterResult.action === 'warn') {
                await message.channel.send(`⚠️ ${filterResult.reason}`);
            }
            return;
        }
        
        // 2. Запоминаем пользователя
        const userData = contextManager.rememberUser(message.author);
        
        // 3. Генерация ответа
        let response = responseGenerator.generateResponse(message, message.author);
        
        // 4. Отправка ответа (с вероятностью 70%)
        if (Math.random() < 0.7) {
            await message.reply(response);
        }
        
        // 5. Анти-спам система
        await this.handleAntiSpam(message, client);
    },
    
    async handleAntiSpam(message, client) {
        const userId = message.author.id;
        const now = Date.now();
        
        if (!spamMap.has(userId)) {
            spamMap.set(userId, []);
        }
        
        const userMessages = spamMap.get(userId);
        userMessages.push(now);
        
        while (userMessages.length > 0 && userMessages[0] < now - TIME_WINDOW) {
            userMessages.shift();
        }
        
        if (userMessages.length > MAX_MESSAGES) {
            try {
                const member = await message.guild.members.fetch(userId);
                if (member.moderatable && !member.permissions.has('Administrator')) {
                    await member.timeout(MUTE_DURATION, 'Автоматический мут за спам');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FF4444')
                        .setTitle('🚫 Автоматический мут за спам')
                        .setDescription(`Пользователь ${message.author.tag} был замучен за спам`)
                        .addFields(
                            { name: '📊 Сообщений за 5 секунд', value: userMessages.length.toString(), inline: true },
                            { name: '⏱️ Длительность', value: '10 минут', inline: true }
                        )
                        .setTimestamp();
                    
                    await message.channel.send({ embeds: [embed] });
                    spamMap.delete(userId);
                    
                    await client.logModeration(
                        message.guild.id,
                        'Автоматический мут (Anti-Spam)',
                        message.author,
                        client.user,
                        'Спам в чате',
                        { extra: `Сообщений за 5 секунд: ${userMessages.length}` }
                    );
                }
            } catch (error) {
                console.error('Ошибка автоматического мута:', error);
            }
        }
        
        // Очистка старых записей
        if (Math.random() < 0.01) {
            for (const [id, messages] of spamMap) {
                const validMessages = messages.filter(time => time > now - TIME_WINDOW);
                if (validMessages.length === 0) {
                    spamMap.delete(id);
                } else {
                    spamMap.set(id, validMessages);
                }
            }
        }
    }
};
