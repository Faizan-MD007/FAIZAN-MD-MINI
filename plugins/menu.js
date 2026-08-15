const { cmd, commands } = require('../arslan');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const { sendBtns } = require('../lib/buttons');

// Emojis arrays
const menuEmojis = ['✨', '❤️‍🩹', '⭐', '💫', '🎯', '🎨', '🎪', '🎭'];
const activeEmojis = ['✅', '🟢', '💚', '✔️', '☑️'];
const disabledEmojis = ['❌', '🔴', '⛔', '🚫', '❎'];
const fastEmojis = ['⚡', '🚀', '💨', '⏱️', '🔥'];
const slowEmojis = ['🌒', '🐌', '⏳', '⌛', '🕐'];

const categoryEmojis = {
    general: ['📱', '🔧', '⚙️', '🛠️'],
    owner: ['👑', '🔱', '💎', '🎖️'],
    admin: ['🛡️', '⚔️', '🔐', '👮'],
    group: ['👥', '👫', '🧑‍🤝‍🧑', '👨‍👩‍👧‍👦'],
    download: ['📥', '⬇️', '💾', '📦'],
    ai: ['🤖', '🧠', '💭', '🎯'],
    search: ['🔍', '🔎', '🕵️', '📡'],
    info: ['ℹ️', '📋', '📊', '📄'],
    fun: ['🎮', '🎲', '🎰', '🎪'],
    games: ['🎮', '🕹️', '🎯', '🏆'],
    images: ['🖼️', '📸', '🎨', '🌄'],
    menu: ['📜', '📋', '📑', '📚'],
    tools: ['🔨', '🔧', '⚡', '🛠️'],
    stickers: ['🎭', '😀', '🎨', '🖼️'],
    utility: ['📂', '🔧', '⚙️', '🛠️'],
    settings: ['⚙️', '🔧', '🛠️', '📱']
};

function getRandomEmoji(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getCategoryEmoji(category) {
    const emojis = categoryEmojis[category.toLowerCase()] || ['📂', '📁', '🗂️', '📋'];
    return getRandomEmoji(emojis);
}

function formatTime() {
    const now = new Date();
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Karachi'
    };
    return now.toLocaleTimeString('en-US', options);
}

// Command stats tracking
const commandStats = new Map();

cmd({
    pattern: "menu",
    alias: ["shelp", "smart", "help2"],
    desc: "Interactive smart menu with live status",
    category: "menu",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, prefix }) => {
    try {
        // Get all commands
        const allCommands = Array.from(commands.values());
        const categories = [...new Set(allCommands.map(cmd => cmd.category))].filter(Boolean);

        // Calculate stats
        const stats = Array.from(commandStats.entries()).map(([cmd, data]) => ({
            command: cmd,
            usage: data.count,
            avgResponse: data.totalTime / data.count
        })).sort((a, b) => b.usage - a.usage);

        // Random emojis
        const menuEmoji = getRandomEmoji(menuEmojis);
        const activeEmoji = getRandomEmoji(activeEmojis);
        const disabledEmoji = getRandomEmoji(disabledEmojis);
        const fastEmoji = getRandomEmoji(fastEmojis);
        const slowEmoji = getRandomEmoji(slowEmojis);

        // Build menu text
        let menuText = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${menuEmoji} ${config.OWNER_NAME || 'FAIZAN'} ${menuEmoji} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 📱 𝐁𝐨𝐭:* ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'}
*│❀ 🔖 𝐕𝐞𝐫𝐬𝐢𝐨𝐧:* 5.0.0
*│❀ 👤 𝐎𝐰𝐧𝐞𝐫:* ${config.OWNER_NAME || 'FAIZAN'}
*│❀ ⏰ 𝐓𝐢𝐦𝐞:* ${formatTime()}
*│❀ 🔣 𝐏𝐫𝐞𝐟𝐢𝐱:* ${config.PREFIX || '.'}
*│❀ 📊 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬:* ${allCommands.length}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

`;

        // Top commands
        const topCmds = stats.slice(0, 3);
        if (topCmds.length > 0) {
            menuText += `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 🔥 𝐓𝐎𝐏 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 🔥 ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*\n`;

            topCmds.forEach((c, i) => {
                const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                menuText += `*│❀ ${rank} .${c.command}* • ${c.usage} uses\n`;
            });

            menuText += `*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*\n\n`;
        }

        // Categories loop
        for (const cat of categories) {
            const catEmoji = getCategoryEmoji(cat);
            const catCmds = allCommands.filter(cmd => cmd.category === cat);

            menuText += `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${catEmoji} ${cat.toUpperCase()} ${catEmoji} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*\n`;

            catCmds.forEach((cmd, index) => {
                const cmdStats = commandStats.get(cmd.pattern);
                let speedTag = '';

                if (cmdStats) {
                    const avgTime = cmdStats.totalTime / cmdStats.count;
                    if (avgTime < 100) speedTag = ` ${fastEmoji}`;
                    else if (avgTime > 1000) speedTag = ` ${slowEmoji}`;
                }

                menuText += `*│❀ .${cmd.pattern}*${speedTag}\n`;
            });

            menuText += `*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*\n\n`;
        }

        // Legend
        menuText += `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 💡 𝐋𝐄𝐆𝐄𝐍𝐃 💡 ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ ${activeEmoji} Active Command*
*│❀ ${disabledEmoji} Disabled Command*
*│❀ ${fastEmoji} Fast Response*
*│❀ ${slowEmoji} Slow Response*
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

 ${config.DESCRIPTION || 'Multi-Device WhatsApp Bot'}`;

        // Image (falls back to the bot's default image if MENU_IMAGE_URL is unset)
        const menuImageUrl = config.MENU_IMAGE_URL || config.IMAGE_PATH || '';

        // 4 buttons as requested: ping / owner / uptime (quick replies) + the
        // WhatsApp channel (a real link, so it has to be a cta_url button).
        try {
            await sendBtns(conn, from, {
                title: `📜 ${config.BOT_NAME || 'FAIZAN-MD'}`,
                text: menuText,
                image: { url: menuImageUrl },
                buttons: [
                    { display_text: '🏓 PING', id: `${prefix}ping` },
                    { display_text: '👑 OWNER', id: `${prefix}owner` },
                    { display_text: '⏱️ UPTIME', id: `${prefix}uptime` },
                    { display_text: '📢 CHANNEL', url: config.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbC4SGZLSmbRcz85AZ0d' }
                ]
            }, mek);
        } catch (e) {
            // Newsletter context (channel forward branding) — same fallback shape
            // this command used before buttons existed.
            const contextInfo = {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363425143124298@newsletter',
                    newsletterName: config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃',
                    serverMessageId: 143
                }
            };
            await conn.sendMessage(from, {
                image: { url: menuImageUrl },
                caption: menuText,
                contextInfo: contextInfo
            }, { quoted: mek });
        }

    } catch (error) {
        console.error('Menu Error:', error);
        const errorMsg = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ❌ 𝐄𝐑𝐑𝐎𝐑 ❌ ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ ⚠️ ${error.message || 'Failed to load menu'}*
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

 ${config.DESCRIPTION || 'Multi-Device WhatsApp Bot'}`;

        await conn.sendMessage(from, { text: errorMsg }, { quoted: mek });
    }
});

// Track command usage
module.exports.commandStats = commandStats;
