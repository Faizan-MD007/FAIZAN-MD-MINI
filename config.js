// ═══════════════════════════════════════════════════════════════════════════
//  ███████╗ █████╗ ██╗███████╗ █████╗ ███╗   ██╗    ███╗   ███╗██████╗
//  ██╔════╝██╔══██╗██║╚══███╔╝██╔══██╗████╗  ██║    ████╗ ████║██╔══██╗
//  █████╗  ███████║██║  ███╔╝ ███████║██╔██╗ ██║    ██╔████╔██║██║  ██║
//  ██╔══╝  ██╔══██║██║ ███╔╝  ██╔══██║██║╚██╗██║    ██║╚██╔╝██║██║  ██║
//  ██║     ██║  ██║██║███████╗██║  ██║██║ ╚████║    ██║ ╚═╝ ██║██████╔╝
//  ╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝    ╚═╝     ╚═╝╚═════╝
// ═══════════════════════════════════════════════════════════════════════════
//                    FAIZAN MD - MINI BOT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

module.exports = {

    // ═══════════════════════════════════════════════════════════════════════
    //  🔐 SESSION & DATABASE
    // ═══════════════════════════════════════════════════════════════════════

    /** Session ID for bot authentication and persistence */
    SESSION_ID: process.env.SESSION_ID || "FAIZAN-MD-MINI",

    /**
     * MongoDB Atlas connection string — sessions yahan store hoti hain (mini style).
     * ⚠️ RECOMMENDED: apna khud ka MongoDB URI env variable MONGODB_URI mein set karein.
     * Neeche wala sirf default fallback hai.
     */
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://z7661877_db_user:mzDdJP3WDPCCoUxd@cluster0.ffcjq7q.mongodb.net/',

    // ═══════════════════════════════════════════════════════════════════════
    //  🤖 BOT IDENTITY
    // ═══════════════════════════════════════════════════════════════════════

    /** Command prefix */
    PREFIX: process.env.PREFIX || '.',

    /** Owner's WhatsApp number with country code */
    OWNER_NUMBER: process.env.OWNER_NUMBER || '923266105873',

    /** Display name of the bot */
    BOT_NAME: process.env.BOT_NAME || "*𝐅αɪᴢαɴ-𝐌ᴅ*",

    /** Footer text for bot messages */
    BOT_FOOTER: process.env.BOT_FOOTER || '> *𝐏σωєяє∂ 𝐁у 𝐅αɪᴢαɴ-𝐌ᴅ⎯꯭̽🩷*',

    /** Owner name shown in menus */
    OWNER_NAME: process.env.OWNER_NAME || '*𝐅αɪᴢαɴ-𝐌ᴅ*',

    /** Bot work mode: public | private | group | inbox */
    WORK_TYPE: process.env.WORK_TYPE || "public",

    // ═══════════════════════════════════════════════════════════════════════
    //  👁️ STATUS AUTOMATION
    // ═══════════════════════════════════════════════════════════════════════

    AUTO_VIEW_STATUS: process.env.AUTO_VIEW_STATUS || 'true',
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS || 'true',
    AUTO_LIKE_EMOJI: ['❤️', '🌹', '✨', '🥰', '💖', '😍', '💞', '💕', '☺️', '🤗'],
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || 'false',
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || '*SEEN YOUR STATUS BY FAIZAN-MD* 🤗',

    // ═══════════════════════════════════════════════════════════════════════
    //  😄 AUTO REACT
    // ═══════════════════════════════════════════════════════════════════════

    AUTO_REACT: process.env.AUTO_REACT || 'false',
    AUTO_REACT_EMOJI: ['👀', '🫀', '🧡', '❤️‍🩹', '❣️', '💖', '💝', '🦋', '😘', '🤍', '🥰', '🌝', '💨', '🌟', '✨', '🫦', '💐', '🌺', '🪷', '🍄', '🍁', '🪴', '🥀', '🌈', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌑', '🪽', '🍒', '🍇', '🥖', '🥢', '🛟', '🎀', '🎗️', '🎈', '🎱', '🪀', '🪄', '🪡', '🧷', '🧣', '💍', '🧸', '🔗', '🖇️', '🗞️', '📅', '🔮', '♏', '🇰🇼', '🏳️'],

    // ═══════════════════════════════════════════════════════════════════════
    //  🔗 ANTI-LINK
    // ═══════════════════════════════════════════════════════════════════════

    /** Groups only — admin-enabled via .antilink on/off. Warns + deletes on
     *  first offense, removes the sender from the group on second offense. */
    ANTI_LINK: process.env.ANTI_LINK || 'false',

    // ═══════════════════════════════════════════════════════════════════════
    //  💬 PRESENCE & CHAT SETTINGS
    // ═══════════════════════════════════════════════════════════════════════

    READ_MESSAGE: process.env.READ_MESSAGE || 'false',
    AUTO_TYPING: process.env.AUTO_TYPING || 'false',
    AUTO_RECORDING: process.env.AUTO_RECORDING || 'false',

    // ═══════════════════════════════════════════════════════════════════════
    //  👥 GROUP MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    WELCOME_ENABLE: process.env.WELCOME_ENABLE || 'true',
    GOODBYE_ENABLE: process.env.GOODBYE_ENABLE || 'true',
    WELCOME_MSG: process.env.WELCOME_MSG || null,
    GOODBYE_MSG: process.env.GOODBYE_MSG || null,
    WELCOME_IMAGE: process.env.WELCOME_IMAGE || null,
    GOODBYE_IMAGE: process.env.GOODBYE_IMAGE || null,
    GROUP_INVITE_LINK: process.env.GROUP_INVITE_LINK || '',

    // ═══════════════════════════════════════════════════════════════════════
    //  🛡️ SECURITY & ANTI-CALL
    // ═══════════════════════════════════════════════════════════════════════

    ANTI_CALL: process.env.ANTI_CALL || 'false',
    REJECT_MSG: process.env.REJECT_MSG || '*CALL LATER PLEASE ☺️🌹*',

    // ═══════════════════════════════════════════════════════════════════════
    //  🖼️ MEDIA & LINKS
    // ═══════════════════════════════════════════════════════════════════════

    /** Default bot profile / menu image */
    IMAGE_PATH: process.env.IMAGE_PATH || 'https://files.catbox.moe/ejufwa.jpg',

    /** Image shown by the .alive command (falls back to IMAGE_PATH if unset) */
    ALIVE_IMG: process.env.ALIVE_IMG || '',

    /** Text shown on the .alive command's "Alive" line */
    LIVE_MSG: process.env.LIVE_MSG || 'I am active and running',

    /** Image shown by the .menu command (falls back to IMAGE_PATH if unset) */
    MENU_IMAGE_URL: process.env.MENU_IMAGE_URL || '',

    /** Short tagline shown at the bottom of the .menu command */
    DESCRIPTION: process.env.DESCRIPTION || '> *𝐏σωєяє∂ 𝐁у 𝐅αɪᴢαɴ-𝐌ᴅ⎯꯭̽🩷*',

    /** WhatsApp channel link for updates */
    CHANNEL_LINK: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbBdQyRBPzjUMvx8Fb2g',

    // ═══════════════════════════════════════════════════════════════════════
    //  📡 EXTERNAL API INTEGRATIONS (optional)
    // ═══════════════════════════════════════════════════════════════════════

    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || ''

};
