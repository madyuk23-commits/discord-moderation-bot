const { ActivityType } = require('discord.js');
const giveawayManager = require('../utils/giveawayManager');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ Бот ${client.user.tag} успешно запущен!`);
        console.log(`📊 На серверах: ${client.guilds.cache.size}`);
        console.log(`👥 Всего пользователей: ${client.users.cache.size}`);
        console.log(`💬 Всего каналов: ${client.channels.cache.size}`);
        
        client.isReady = true;
        
        // Статус бота
        const statuses = [
            { name: `${client.guilds.cache.size} серверов`, type: ActivityType.Watching },
            { name: '🎉 /giveaway-start', type: ActivityType.Playing },
            { name: '🛠️ /help', type: ActivityType.Listening },
            { name: '✨ Слэш-команды', type: ActivityType.Custom }
        ];
        
        let i = 0;
        setInterval(() => {
            const status = statuses[i % statuses.length];
            client.user.setActivity(status.name, { type: status.type });
            i++;
        }, 30000);
        
        // Проверка завершенных розыгрышей
        setInterval(async () => {
            try {
                await giveawayManager.checkExpiredGiveaways(client);
            } catch (error) {
                console.error('❌ Ошибка проверки розыгрышей:', error);
            }
        }, 30000);
        
        console.log('🚀 Бот полностью готов к работе!');
    }
};