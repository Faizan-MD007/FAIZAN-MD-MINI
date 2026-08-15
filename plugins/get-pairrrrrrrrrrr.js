const { cmd, commands } = require('../arslan');
const axios = require('axios');

// FIX: this file's `pair` registration collided with plugins/get-pair.js's
// `pair` (same command name, two files) — only the first-loaded one ever
// actually ran. get-pair.js has the retry-hardened, button-equipped version,
// so the duplicate `pair` handler here has been removed; `pair2` (a distinct
// alternate flow / different alias set) is kept as-is.

cmd({
    pattern: "pair2",
    alias: ["getpair2", "reqpair", "clonebot2"],
    react: "📉",
    desc: "Get pairing code for FAIZAN-MD bot",
    category: "download",
    use: ".pair 92323XXX",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, senderNumber, reply }) => {
    try {
        // Check if in group
        if (isGroup) {
            return await reply("❌ This command only works in private chat. Please message me directly.");
        }

        // Show processing reaction
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Extract phone number
        const phoneNumber = q ? q.trim().replace(/[^0-9]/g, '') : senderNumber.replace(/[^0-9]/g, '');

        // Validate phone number
        if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
            return await reply("❌ Invalid phone number format!\n\nPlease use: `.pair 92323000000000`\n(Without + sign)");
        }

        // Get pairing code from API
        const response = await axios.get(`https://arslan-mini-bot-e4ec84c138eb.herokuapp.com/code?number=${encodeURIComponent(phoneNumber)}`);
        
        if (!response.data?.code) {
            return await reply("❌ Failed to get pairing code. Please try again later.");
        }

        const pairingCode = response.data.code;
        
        // Send image with caption
        const sentMessage = await conn.sendMessage(from, {
            image: { url: "https://files.catbox.moe/prkkzj.png" },
            caption: `- *⍴ᥲіrіᥒg ᥴ᥆ძᥱ*\n\n Notification has been sent to your WhatsApp. Please check your phone and copy this code to pair it and get your session id.\n\n*🔢 Pairing Code*: *${pairingCode}*\n\n> *Copy it from below message 👇🏻*`
        }, { quoted: m });

        // Send clean code separately
        await reply(pairingCode);
        
        // Add ✅ reaction to the clean code message
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("Pair command error:", error);
        await reply("❌ An error occurred. Please try again later.");
    }
});
