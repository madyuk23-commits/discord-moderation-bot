class MessageFilter {
    constructor() {
        this.bannedWords = ['spam', 'scam', 'advert', 'реклама', 'спам', 'порно', '18+'];
    }
    
    filter(message) {
        const content = message.content.toLowerCase();
        
        // Проверка на запрещенные слова
        for (const word of this.bannedWords) {
            if (content.includes(word)) {
                return {
                    allowed: false,
                    reason: `Ты серьезно используешь слово "${word}"? Я ожидал большего... 😒`,
                    action: 'delete'
                };
            }
        }
        
        // Проверка на длину сообщения
        if (content.length > 2000) {
            return {
                allowed: false,
                reason: 'Ты что, роман пишешь? 🤦 Сократи до 2000 символов.',
                action: 'warn'
            };
        }
        
        return { allowed: true };
    }
}

module.exports = new MessageFilter();