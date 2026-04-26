const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
        "✅ أرسل البروكسيات سطر بسطر:\nمثال:\n167.172.161.22:1080");
});

async function checkProxy(proxy) {
    const testUrl = "https://api.ipify.org?format=json";
    const protocols = [
        { type: "socks5", agent: new SocksProxyAgent(`socks5://${proxy}`) },
        { type: "http", agent: new HttpProxyAgent(`http://${proxy}`) },
        { type: "https", agent: new HttpsProxyAgent(`http://${proxy}`) }
    ];

    for (let p of protocols) {
        try {
            const start = Date.now();
            const res = await axios.get(testUrl, {
                httpAgent: p.agent,
                httpsAgent: p.agent,
                timeout: 7000
            });
            const ping = Date.now() - start;
            if (res.data.ip) {
                return `✅ ${proxy}\nType: ${p.type}\nIP: ${res.data.ip}\nPing: ${ping}ms`;
            }
        } catch (e) {}
    }

    return `❌ ${proxy} Dead`;
}

bot.on('message', async (msg) => {
    if (msg.text.startsWith('/start')) return;

    const chatId = msg.chat.id;
    const proxies = msg.text.split('\n').map(p => p.trim()).filter(Boolean);

    bot.sendMessage(chatId, "⏳ جاري الفحص...");

    let results = [];
    for (const proxy of proxies) {
        const result = await checkProxy(proxy);
        results.push(result);
    }

    bot.sendMessage(chatId, results.join('\n\n'));
});
