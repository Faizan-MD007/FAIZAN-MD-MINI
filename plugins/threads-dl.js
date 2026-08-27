const { cmd } = require('../arslan');
const axios = require('axios');
const { sendBtns } = require('../lib/buttons');
const config = require('../config');

cmd({
    pattern: "threads",
    alias: ["thread", "thdl"],
    desc: "Download Threads videos/media",
    react: "🧵",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, args, reply, prefix }) => {
    try {
        const url = args[0] || (m.quoted && m.quoted.text);
        if (!url || !/threads\.net/.test(url)) {
            return reply("❌ Please provide a valid Threads URL");
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Using a reliable Threads downloader API
        const apiUrl = `https://api.giftedtech.co.ke/api/download/threads?url=${encodeURIComponent(url)}&apikey=gifted`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.success || !data.result) {
            throw new Error("API failed or media not found");
        }

        const result = data.result;
        const mediaUrl = result.download_url || result.video_url || result.image_url;
        
        if (!mediaUrl) throw new Error("No media URL found");

        const infoText = `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 🎬 𝐓𝐢𝐭𝐥𝐞:* Threads Media
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* Ready
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.BOT_FOOTER || 'ᴘᴏᴡᴇʀᴇ∂ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍'}`;

        await sendBtns(conn, from, {
            title: '🧵 THREADS DOWNLOADER',
            text: infoText,
            buttons: [
                { display_text: '🎬 𝐕ι∂єσ', id: `${prefix}thgrab ${url} video` },
                { display_text: '🎵 𝐀υ∂ιο', id: `${prefix}thgrab ${url} audio` }
            ]
        }, mek);

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error("Threads DL Error:", err);
        reply("❌ Download failed. Please make sure the link is public and try again.");
    }
});

// Hidden handler for actual download
cmd({
    pattern: "thgrab",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (!args.length) return;
    const url = args[0];
    const wantAudio = (args[1] || '').toLowerCase() === 'audio';
    
    try {
        await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });
        
        const apiUrl = `https://api.giftedtech.co.ke/api/download/threads?url=${encodeURIComponent(url)}&apikey=gifted`;
        const { data } = await axios.get(apiUrl);
        
        if (!data || !data.success || !data.result) throw new Error("API failed");
        
        const result = data.result;
        const mediaUrl = result.download_url || result.video_url || result.image_url;

        if (wantAudio) {
            await conn.sendMessage(from, {
                audio: { url: mediaUrl },
                mimetype: "audio/mp4",
                ptt: false
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                video: { url: mediaUrl },
                mimetype: "video/mp4",
                caption: `*🧵 THREADS VIDEO DOWNLOADED*\n\n${config.BOT_FOOTER}`
            }, { quoted: mek });
        }
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } catch (err) {
        reply(`❌ Download Failed: ${err.message}`);
    }
});
