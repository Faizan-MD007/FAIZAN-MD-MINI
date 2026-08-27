const { cmd } = require('../arslan');
const fs = require('fs');
const path = require('path');
const config = require('../config');


// Ban list file path
const banFile = path.join(__dirname, '../assets/ban.json');

// Ensure assets folder exists
if (!fs.existsSync(path.dirname(banFile))) {
    fs.mkdirSync(path.dirname(banFile), { recursive: true });
}

// Load ban list
let banList = [];
if (fs.existsSync(banFile)) {
    try {
        banList = JSON.parse(fs.readFileSync(banFile, 'utf-8'));
    } catch (e) {
        banList = [];
    }
}

// Save ban list
function saveBanList() {
    fs.writeFileSync(banFile, JSON.stringify(banList, null, 2));
}

// Check if user is banned
function isBanned(userId) {
    return banList.includes(userId);
}

// Ban user
function banUser(userId) {
    if (!banList.includes(userId)) {
        banList.push(userId);
        saveBanList();
        return true;
    }
    return false;
}

// Unban user
function unbanUser(userId) {
    if (banList.includes(userId)) {
        banList = banList.filter(id => id !== userId);
        saveBanList();
        return true;
    }
    return false;
}

// Get ban list
function getBanList() {
    return banList;
}

function faizanStyle(title, value, status) {
    return `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 🔨 ${title}:* ${value}
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* ${status}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.DESCRIPTION || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍'}
`;
}

// Ban/Unban logic consolidated into unblock.js
// Only list-management commands remain here.

// ============ BAN LIST COMMAND ============
cmd({
    pattern: "banlist",
    alias: ["banned", "blocked"],
    desc: "Show list of banned users",
    category: "owner",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner }) => {
    try {
        if (!isOwner) {
            return reply(faizanStyle('BAN LIST', 'Owner only command', '❌'));
        }

        if (banList.length === 0) {
            return reply(faizanStyle('BAN LIST', 'No banned users', 'ℹ️'));
        }

        let listText = `📋 *BANNED USERS (${banList.length})*\n\n`;
        banList.forEach((id, i) => {
            const number = id.split('@')[0];
            listText += `${i+1}. +${number}\n`;
        });
        listText += `\nUse .unban @user to unban`;

        await reply(faizanStyle('BAN LIST', listText, '✅'));

    } catch (err) {
        console.error('Ban list error:', err);
        reply(faizanStyle('ERROR', err.message, '❌'));
    }
});

// ============ CHECK BAN STATUS ============
cmd({
    pattern: "checkban",
    alias: ["banstatus", "isbanned"],
    desc: "Check if a user is banned",
    category: "owner",
    react: "🔍",
    filename: __filename
},
async (conn, mek, m, { from, args, reply, isOwner }) => {
    try {
        if (!isOwner) {
            return reply(faizanStyle('CHECK BAN', 'Owner only command', '❌'));
        }

        let target = null;
        
        if (m.quoted && m.quoted.sender) {
            target = m.quoted.sender;
        }
        else if (m.mentionedJid && m.mentionedJid[0]) {
            target = m.mentionedJid[0];
        }
        else if (args[0]) {
            let num = args[0].replace(/[^0-9]/g, '');
            if (num.length >= 10) {
                target = num + '@s.whatsapp.net';
            }
        }

        if (!target) {
            return reply(faizanStyle('CHECK BAN', 'Please mention/tag a user', '❌'));
        }

        const banned = banList.includes(target);
        const status = banned ? '✅ BANNED' : '❌ NOT BANNED';
        
        await reply(faizanStyle('CHECK BAN', `User @${target.split('@')[0]}\n\nStatus: ${status}`, banned ? '🔨' : '✅'));

    } catch (err) {
        console.error('Check ban error:', err);
        reply(faizanStyle('ERROR', err.message, '❌'));
    }
});

// Export functions
module.exports = {
    isBanned,
    banUser,
    unbanUser,
    getBanList
};
