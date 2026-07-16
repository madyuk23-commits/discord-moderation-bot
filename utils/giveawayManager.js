const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const giveawaysPath = path.join(__dirname, '../data/giveaways.json');

function loadGiveaways() {
    try {
        if (!fs.existsSync(giveawaysPath)) {
            fs.mkdirSync(path.dirname(giveawaysPath), { recursive: true });
            fs.writeFileSync(giveawaysPath, JSON.stringify({}, null, 2));
            return {};
        }
        return JSON.parse(fs.readFileSync(giveawaysPath, 'utf8'));
    } catch (error) {
        console.error('Ошибка загрузки розыгрышей:', error);
        return {};
    }
}

function saveGiveaways(giveaways) {
    try {
        fs.writeFileSync(giveawaysPath, JSON.stringify(giveaways, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения розыгрышей:', error);
    }
}

class GiveawayManager {
    constructor() {
        this.giveaways = loadGiveaways();
    }
    
    async createGiveaway(guildId, channelId, messageId, prize, duration, endTime, winnersCount, hostId, requiredRoleId = null, description = '') {
        const giveaway = {
            messageId,
            guildId,
            channelId,
            prize,
            duration,
            endTime,
            winnersCount,
            hostId,
            requiredRoleId,
            description,
            participants: [],
            ended: false,
            createdAt: Date.now()
        };
        
        if (!this.giveaways[guildId]) {
            this.giveaways[guildId] = {};
        }
        
        this.giveaways[guildId][messageId] = giveaway;
        saveGiveaways(this.giveaways);
        
        console.log(`✅ Создан розыгрыш "${prize}" (ID: ${messageId})`);
        return giveaway;
    }
    
    async getGiveaway(messageId) {
        for (const guildId in this.giveaways) {
            if (this.giveaways[guildId][messageId]) {
                return this.giveaways[guildId][messageId];
            }
        }
        return null;
    }
    
    async getActiveGiveaways(guildId) {
        if (!this.giveaways[guildId]) return [];
        
        const active = [];
        for (const messageId in this.giveaways[guildId]) {
            const giveaway = this.giveaways[guildId][messageId];
            if (!giveaway.ended) {
                active.push(giveaway);
            }
        }
        return active;
    }
    
    async saveGiveaway(giveaway) {
        if (!this.giveaways[giveaway.guildId]) {
            this.giveaways[giveaway.guildId] = {};
        }
        this.giveaways[giveaway.guildId][giveaway.messageId] = giveaway;
        saveGiveaways(this.giveaways);
    }
    
    async endGiveaway(messageId, client, forceEnd = false) {
        const giveaway = await this.getGiveaway(messageId);
        if (!giveaway) {
            console.warn(`⚠️ Розыгрыш ${messageId} не найден`);
            return;
        }
        
        if (giveaway.ended && !forceEnd) {
            console.warn(`⚠️ Розыгрыш ${messageId} уже завершен`);
            return;
        }
        
        giveaway.ended = true;
        await this.saveGiveaway(giveaway);
        
        try {
            const channel = await client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);
            
            const reaction = message.reactions.cache.get('🎉');
            let participants = giveaway.participants || [];
            
            if (reaction) {
                const users = await reaction.users.fetch();
                const botFiltered = users.filter(user => !user.bot);
                
                let finalParticipants = [];
                for (const user of botFiltered.values()) {
                    try {
                        const member = await channel.guild.members.fetch(user.id);
                        if (giveaway.requiredRoleId) {
                            if (member.roles.cache.has(giveaway.requiredRoleId)) {
                                finalParticipants.push(user.id);
                            }
                        } else {
                            finalParticipants.push(user.id);
                        }
                    } catch (error) {}
                }
                
                participants = finalParticipants;
                giveaway.participants = participants;
                await this.saveGiveaway(giveaway);
            }
            
            let winners = [];
            if (participants.length === 0) {
                await channel.send(`❌ В розыгрыше "${giveaway.prize}" нет участников!`);
                return;
            }
            
            const shuffled = [...participants];
            for (let i = 0; i < Math.min(giveaway.winnersCount, shuffled.length); i++) {
                const randomIndex = Math.floor(Math.random() * shuffled.length);
                winners.push(shuffled.splice(randomIndex, 1)[0]);
            }
            
            const winnerMentions = winners.map(id => `<@${id}>`).join(' ');
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎉 РОЗЫГРЫШ ЗАВЕРШЕН!')
                .setDescription(`**Приз:** ${giveaway.prize}`)
                .addFields(
                    { name: '👑 Победители', value: winnerMentions || 'Нет победителей', inline: false },
                    { name: '👥 Участников', value: participants.length.toString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID розыгрыша: ${messageId}` });
            
            if (forceEnd) {
                embed.addFields({ name: '⛔ Статус', value: 'Досрочно остановлен', inline: true });
            }
            
            await channel.send({ embeds: [embed] });
            
            for (const winnerId of winners) {
                try {
                    const winner = await client.users.fetch(winnerId);
                    await winner.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFD700')
                                .setTitle('🎉 Поздравляем! Вы выиграли розыгрыш!')
                                .setDescription(`**Сервер:** ${channel.guild.name}`)
                                .addFields(
                                    { name: '🏆 Приз', value: giveaway.prize, inline: false }
                                )
                                .setTimestamp()
                        ]
                    });
                } catch (error) {}
            }
            
            const oldEmbed = message.embeds[0];
            if (oldEmbed) {
                const updatedEmbed = EmbedBuilder.from(oldEmbed)
                    .setColor('#808080')
                    .setTitle('🎉 РОЗЫГРЫШ ЗАВЕРШЕН')
                    .setDescription(`**Приз:** ${giveaway.prize}`)
                    .addFields(
                        { name: '👑 Победители', value: winnerMentions || 'Нет победителей', inline: false },
                        { name: '👥 Участников', value: participants.length.toString(), inline: true }
                    );
                
                await message.edit({ embeds: [updatedEmbed], components: [] });
            }
            
            console.log(`✅ Розыгрыш "${giveaway.prize}" завершен`);
        } catch (error) {
            console.error(`❌ Ошибка завершения розыгрыша ${messageId}:`, error);
        }
    }
    
    async rerollGiveaway(messageId, client) {
        const giveaway = await this.getGiveaway(messageId);
        if (!giveaway) throw new Error('Розыгрыш не найден');
        if (!giveaway.ended) throw new Error('Розыгрыш еще не завершен');
        if (giveaway.participants.length === 0) throw new Error('Нет участников для перекрутки');
        
        const shuffled = [...giveaway.participants];
        const randomIndex = Math.floor(Math.random() * shuffled.length);
        const winnerId = shuffled[randomIndex];
        
        try {
            const channel = await client.channels.fetch(giveaway.channelId);
            const winner = await client.users.fetch(winnerId);
            
            await channel.send(`🎉 **Перекрутка!** Новый победитель: <@${winnerId}>`);
            
            try {
                await winner.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FFD700')
                            .setTitle('🎉 Вы выиграли перекрутку розыгрыша!')
                            .setDescription(`**Сервер:** ${channel.guild.name}`)
                            .addFields(
                                { name: '🏆 Приз', value: giveaway.prize, inline: false }
                            )
                            .setTimestamp()
                    ]
                });
            } catch (error) {}
            
            return `<@${winnerId}>`;
        } catch (error) {
            console.error(`❌ Ошибка перекрутки розыгрыша ${messageId}:`, error);
            throw error;
        }
    }
    
    async checkExpiredGiveaways(client) {
        const now = Date.now();
        for (const guildId in this.giveaways) {
            for (const messageId in this.giveaways[guildId]) {
                const giveaway = this.giveaways[guildId][messageId];
                if (!giveaway.ended && giveaway.endTime <= now) {
                    await this.endGiveaway(messageId, client);
                }
            }
        }
    }
}

module.exports = new GiveawayManager();