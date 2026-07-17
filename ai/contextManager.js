const fs = require('fs');
const path = require('path');

class ContextManager {
    constructor() {
        this.memoryPath = path.join(__dirname, '../data/ai_memory.json');
        this.memory = this.loadMemory();
    }
    
    loadMemory() {
        try {
            if (!fs.existsSync(this.memoryPath)) {
                fs.mkdirSync(path.dirname(this.memoryPath), { recursive: true });
                return {
                    users: {},
                    global: {
                        totalMessages: 0,
                        uniqueUsers: []
                    }
                };
            }
            const data = fs.readFileSync(this.memoryPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Ошибка загрузки памяти:', error);
            return {
                users: {},
                global: {
                    totalMessages: 0,
                    uniqueUsers: []
                }
            };
        }
    }
    
    saveMemory() {
        try {
            fs.writeFileSync(this.memoryPath, JSON.stringify(this.memory, null, 2));
        } catch (error) {
            console.error('Ошибка сохранения памяти:', error);
        }
    }
    
    rememberUser(user) {
        const userId = user.id;
        
        if (!this.memory.users[userId]) {
            this.memory.users[userId] = {
                username: user.username,
                firstSeen: Date.now(),
                messagesCount: 0,
                warnings: 0,
                mood: 'neutral',
                lastInteraction: Date.now()
            };
            this.memory.global.uniqueUsers.push(userId);
        }
        
        const userData = this.memory.users[userId];
        userData.messagesCount++;
        userData.lastInteraction = Date.now();
        userData.username = user.username;
        this.memory.global.totalMessages++;
        this.saveMemory();
        
        return userData;
    }
    
    resetUser(userId) {
        if (this.memory.users[userId]) {
            delete this.memory.users[userId];
            this.saveMemory();
            return true;
        }
        return false;
    }
    
    getStats() {
        return {
            totalUsers: this.memory.global.uniqueUsers.length,
            totalMessages: this.memory.global.totalMessages,
            activeUsers: Object.keys(this.memory.users).filter(
                id => this.memory.users[id].lastInteraction > Date.now() - 3600000
            ).length
        };
    }
}

module.exports = new ContextManager();