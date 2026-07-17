const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Создание клиента с нужными интентами
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ]
});

// Коллекции для слэш-команд
client.commands = new Collection();
client.isReady = false;

// Функция загрузки команд
const loadCommands = () => {
    const commandsPath = path.join(__dirname, 'commands');
    if (!fs.existsSync(commandsPath)) {
        console.log('⚠️ Папка commands не найдена');
        return [];
    }
    
    const commandCategories = fs.readdirSync(commandsPath);
    const commands = [];
    
    for (const category of commandCategories) {
        const categoryPath = path.join(commandsPath, category);
        if (!fs.statSync(categoryPath).isDirectory()) continue;
        
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            try {
                const command = require(path.join(categoryPath, file));
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(`✅ Загружена слэш-команда: /${command.data.name}`);
                }
            } catch (error) {
                console.error(`❌ Ошибка загрузки команды ${file}:`, error);
            }
        }
    }
    
    console.log(`✅ Загружено ${commands.length} слэш-команд`);
    return commands;
};

// Регистрация слэш-команд
const registerCommands = async (commands) => {
    if (!process.env.CLIENT_ID || !process.env.GUILD_ID) {
        console.warn('⚠️ CLIENT_ID или GUILD_ID не указаны в .env');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Регистрация слэш-команд...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log(`✅ Зарегистрировано ${commands.length} слэш-команд для гильдии ${process.env.GUILD_ID}`);
    } catch (error) {
        console.error('❌ Ошибка регистрации слэш-команд:', error);
    }
};

// Функция загрузки событий
const loadEvents = () => {
    const eventsPath = path.join(__dirname, 'events');
    if (!fs.existsSync(eventsPath)) {
        console.log('⚠️ Папка events не найдена');
        return;
    }
    
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        try {
            const event = require(path.join(eventsPath, file));
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`✅ Загружено событие: ${event.name}`);
        } catch (error) {
            console.error(`❌ Ошибка загрузки события ${file}:`, error);
        }
    }
};

// Обработка слэш-команд
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        return interaction.reply({
            content: '❌ Команда не найдена!',
            ephemeral: true
        });
    }
    
    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(`❌ Ошибка выполнения слэш-команды /${interaction.commandName}:`, error);
        
        const errorMessage = {
            content: '❌ Произошла ошибка при выполнении команды!\nПожалуйста, попробуйте позже или сообщите администратору.',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Функция логирования модерации
client.logModeration = async (guildId, action, target, moderator, reason, details = {}) => {
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (!logChannelId) {
        console.warn('⚠️ LOG_CHANNEL_ID не указан в .env');
        return;
    }
    
    try {
        const { EmbedBuilder } = require('discord.js');
        const guild = await client.guilds.fetch(guildId);
        if (!guild) return;
        
        const logChannel = await guild.channels.fetch(logChannelId);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`🔨 Действие модерации: ${action}`)
            .setThumbnail(target.displayAvatarURL ? target.displayAvatarURL() : target.avatarURL ? target.avatarURL() : null)
            .setDescription(`**Модератор:** ${moderator.tag} (${moderator.id})\n**Пользователь:** ${target.tag} (${target.id})`)
            .addFields(
                { name: '📝 Причина', value: reason || 'Не указана', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `ID: ${target.id}`, iconURL: client.user.displayAvatarURL() });
        
        if (details.extra) {
            embed.addFields({ name: '📌 Дополнительно', value: details.extra, inline: false });
        }
        
        await logChannel.send({ embeds: [embed] });
        console.log(`📝 Лог записан: ${action} -> ${target.tag}`);
    } catch (error) {
        console.error('❌ Ошибка логирования:', error);
    }
};

// Обработка ошибок
process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанное исключение:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Непойманная ошибка:', error);
});

// Загрузка и запуск
console.log('🚀 Запуск бота...');
const commands = loadCommands();
loadEvents();

// Регистрация команд после готовности
client.once('ready', async () => {
    await registerCommands(commands);
});

// Запуск бота
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Ошибка входа в бота:', error);
    process.exit(1);
});

const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

// Простой эндпоинт для проверки
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(port, () => {
    console.log(`✅ Веб-сервер для пинга запущен на порту ${port}`);
});

module.exports = { client };
