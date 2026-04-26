const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '✅ أرسل قائمة بروكسيات وسأفحصها');
});

async function checkProxy(proxy) {
    try {
        let agent;

        if (proxy.startsWith('socks')) {
            agent = new SocksProxyAgent(proxy);
        } else if (proxy.startsWith('http://')) {
            agent = new HttpProxyAgent(proxy);
        } else {
            agent = new HttpsProxyAgent('http://' + proxy);
        }

        const res = await axios.get('http://ip-api.com/json/', {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 8000
        });

        if (res.data && res.data.query) {
            return `✅ ${proxy}\n🌍 ${res.data.country}\n🆔 ${res.data.query}`;
        }
    } catch (e) {
        return null;
    }
}

bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const proxies = msg.text.split('\n').map(p => p.trim()).filter(Boolean);

    bot.sendMessage(chatId, '⏳ جاري الفحص...');

    let results = [];

    for (const proxy of proxies) {
        const result = await checkProxy(proxy);
        if (result) results.push(result);
    }

    if (results.length > 0) {
        bot.sendMessage(chatId, results.join('\n\n'));
    } else {
        bot.sendMessage(chatId, '❌ لم أجد بروكسي شغال');
    }
});

console.log('Bot started...');
