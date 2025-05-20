// Import the library
require('dotenv').config({ path: '../.env' });
const telegramApiKey = process.env.TELEGRAM_API_KEY;
const TelegramBot = require('node-telegram-bot-api');

console.log('TELEGRAM_API_KEY:', telegramApiKey);

// Replace with your actual Bot Token from @BotFather
const token = telegramApiKey;

// Create a new bot instance
const bot = new TelegramBot(token, { 
    polling: {
        interval: 2000,
        autoStart: true,
        params: {
            timeout: 10,
            dropPendingUpdates: true
        }
    }
});

// Listen for any message
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // Echo the received message back
  bot.sendMessage(chatId, `You said: ${text}`);
});

// Optional: Log when bot starts
console.log('canifly_bot is running!');