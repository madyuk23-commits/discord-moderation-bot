const personality = require('./personality');

class ResponseGenerator {
    constructor() {
        this.context = {
            userTags: new Map(),
            conversationHistory: [],
            insideJokes: new Map()
        };
    }
    
    // Основной метод генерации ответа
    generateResponse(message, user) {
        const username = user.username;
        const msgContent = message.content;
        
        // Проверка на пустое сообщение
        if (!msgContent || msgContent.trim().length === 0) {
            return this.getEmptyMessageResponse();
        }
        
        // Определение типа сообщения
        const msgType = this.detectMessageType(msgContent);
        
        // Получение шаблона ответа
        const template = this.getResponseTemplate(msgType);
        
        // Кастомизация ответа под пользователя
        const personalized = this.personalizeResponse(template, username, msgContent);
        
        // Добавление сарказма/юмора
        const finalResponse = this.addPersonality(personalized);
        
        // Сохранение контекста
        this.saveContext(user, message);
        
        return finalResponse;
    }
    
    // Определение типа сообщения
    detectMessageType(content) {
        const lower = content.toLowerCase();
        
        if (lower.includes('?')) return 'question';
        
        if (['привет', 'здравствуй', 'хай', 'hi', 'hello', 'ку', 'здарова'].some(w => lower.includes(w))) {
            return 'greeting';
        }
        
        const insults = ['дурак', 'идиот', 'тупой', 'лох', 'дебил', 'урод', 'козел', 'слабо', 'ты не', 'ты без'];
        if (insults.some(w => lower.includes(w))) return 'insult';
        
        const compliments = ['хороший', 'умный', 'крутой', 'лучший', 'классный', 'милый', 'отличный'];
        if (compliments.some(w => lower.includes(w))) return 'compliment';
        
        if (['помоги', 'помощь', 'help', 'помогите', 'как сделать', 'объясни'].some(w => lower.includes(w))) {
            return 'help';
        }
        
        return 'random';
    }
    
    // Получение шаблона ответа
    getResponseTemplate(type) {
        const templates = personality.responseTemplates;
        const available = templates[type] || templates.random;
        return available[Math.floor(Math.random() * available.length)];
    }
    
    // Персонализация ответа
    personalizeResponse(template, username, content) {
        let response = template;
        
        // Замена плейсхолдеров
        response = response.replace(/%username%/g, username);
        response = response.replace(/{content}/g, content);
        
        // Добавление случайного сарказма
        if (Math.random() < 0.4) {
            const sarcasticEndings = [
                ', если ты еще не понял 🙄',
                ', но я не удивлен, что ты этого не знаешь',
                ', а что, не очевидно?',
                ', но для таких как ты - это сложно',
                ', я бы сказал это очевидно... но не для всех'
            ];
            response += sarcasticEndings[Math.floor(Math.random() * sarcasticEndings.length)];
        }
        
        // Добавление эмодзи
        if (personality.style.useEmojis) {
            const emojis = ['😏', '🙄', '😒', '🤦', '😂', '🤣', '😈', '👑', '🔥', '💀', '👀', '🤡'];
            if (Math.random() < 0.7) {
                response += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
            }
        }
        
        return response;
    }
    
    // Добавление личности
    addPersonality(response) {
        let final = response;
        
        // Добавление агрессивности
        if (personality.traits.aggression > 0.5 && Math.random() < 0.3) {
            const aggressivePrefix = [
                'Слушай сюда, ',
                'Хватит ныть, ',
                'Не тупи, ',
                'Врубайся, '
            ];
            final = aggressivePrefix[Math.floor(Math.random() * aggressivePrefix.length)] + final;
        }
        
        // Высокомерие
        if (personality.traits.arrogance > 0.5 && Math.random() < 0.4) {
            const arrogantPhrases = [
                'Я конечно лучше всех знаю, но... ',
                'Мой IQ выше твоего возраста, поэтому... ',
                'Как эксперт скажу... '
            ];
            final = arrogantPhrases[Math.floor(Math.random() * arrogantPhrases.length)] + final;
        }
        
        // Случайный капс
        if (personality.style.useCaps && Math.random() < 0.15) {
            const words = final.split(' ');
            const randomIndex = Math.floor(Math.random() * words.length);
            words[randomIndex] = words[randomIndex].toUpperCase();
            final = words.join(' ');
        }
        
        return final;
    }
    
    // Ответ на пустое сообщение
    getEmptyMessageResponse() {
        const responses = [
            "Ты что-то хотел сказать или просто дышишь? 🙄",
            "Пустое сообщение - пустой ответ. Иди думай.",
            "Я не телепат! Напиши что-нибудь, если не трудно.",
            "Ты серьезно? Отправил пустое сообщение и ждешь ответа? 😂"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Сохранение контекста
    saveContext(user, message) {
        const userId = user.id;
        
        if (!this.context.userTags.has(userId)) {
            this.context.userTags.set(userId, {
                firstSeen: Date.now(),
                messagesCount: 0,
                mood: 'neutral',
                insideJokes: []
            });
        }
        
        const userData = this.context.userTags.get(userId);
        userData.messagesCount++;
        
        this.context.conversationHistory.push({
            userId: userId,
            username: user.username,
            content: message.content,
            timestamp: Date.now()
        });
        
        if (this.context.conversationHistory.length > 100) {
            this.context.conversationHistory.shift();
        }
    }
}

module.exports = new ResponseGenerator();