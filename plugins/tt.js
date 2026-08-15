const { cmd } = require('../arslan');
const axios = require('axios');
const { sendBtns } = require('../lib/buttons');

const API = "https://www.tikwm.com/api/";

// Strips hashtags (and the double-spaces left behind) so the "copy caption"
// button only ever copies the plain title text, in whichever language TikTok
// gave it (Urdu or English) — never a #tag, never anything else appended.
function cleanCaption(title) {
    if (!title) return '';
    return title.replace(/#[^\s#]+/g, '').replace(/\s{2,}/g, ' ').trim();
}

cmd({
    pattern: "tiktok",
    alias: ["tt"],
    desc: "Ultra Fast TikTok Downloader",
    react: "⚡",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, args, reply, prefix }) => {

    try {

        if (!args[0] || !/tiktok\.com/.test(args[0])) {
            return reply("❌ Please provide a valid TikTok URL");
        }

        const url = args[0];

        // ⚡ Instant wait message
        const processingMsg = await conn.sendMessage(from, {
            text: "⚡ Please wait..."
        }, { quoted: mek });

        // 🚀 Ultra fast API call (no delay)
        const { data } = await axios.get(API, {
            params: { url },
            timeout: 20000
        });

        if (!data || data.code !== 0 || !data.data.play) {
            throw new Error("API failed");
        }

        const result = data.data;
        const caption = cleanCaption(result.title) || 'TikTok Video';

        // ✏ Edit message to Processing
        await conn.sendMessage(from, {
            text: "⚡ Ready — pick an option below...",
            edit: processingMsg.key
        });

        const infoText =
`ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_ ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 🎬 𝐓𝐢𝐭𝐥𝐞:* ${result.title || "TikTok Video"}
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* Ready
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍`;

        // 3 buttons as requested: VIDEO / AUDIO download the actual media via
        // the hidden ttgrab handler; COPY CAPTION copies the plain title text
        // directly (no #tags, nothing else appended).
        try {
            await sendBtns(conn, from, {
                title: '⚡ TIKTOK',
                text: infoText,
                ...(result.cover ? { image: { url: result.cover } } : {}),
                buttons: [
                    { display_text: '🎬 VIDEO', id: `${prefix}ttgrab ${url} video` },
                    { display_text: '🎵 AUDIO', id: `${prefix}ttgrab ${url} audio` },
                    { display_text: '📋 COPY CAPTION', copy_code: caption }
                ]
            }, mek);
        } catch (e) {
            // Fallback: no buttons available -> send the video directly, as before.
            await conn.sendMessage(from, {
                video: { url: result.play },
                mimetype: "video/mp4",
                caption: infoText
            }, { quoted: mek });
        }

        // ❌ Delete processing message (optional clean UI)
        await conn.sendMessage(from, {
            delete: processingMsg.key
        });

    } catch (err) {

        const errorCaption =
`ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_ ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ ❌ 𝐄𝐫𝐫𝐨𝐫:* Download Failed
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* Try Again
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍`;

        reply(errorCaption);
    }
});

// ============ HIDDEN: ACTUAL VIDEO/AUDIO DOWNLOAD, TRIGGERED BY BUTTON TAP ============
cmd({
    pattern: "ttgrab",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (!args.length) return;
    const url = args[0];
    const wantAudio = (args[1] || '').toLowerCase() === 'audio';
    try {
        const { data } = await axios.get(API, { params: { url }, timeout: 20000 });
        if (!data || data.code !== 0 || !data.data.play) throw new Error("API failed");
        const result = data.data;

        if (wantAudio) {
            if (!result.music) throw new Error("No audio track found for this video");
            await conn.sendMessage(from, {
                audio: { url: result.music },
                mimetype: "audio/mp4",
                caption: `🎵 ${cleanCaption(result.title) || 'TikTok Audio'}`
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                video: { url: result.play },
                mimetype: "video/mp4",
                caption: `🎬 ${cleanCaption(result.title) || 'TikTok Video'}`
            }, { quoted: mek });
        }
    } catch (err) {
        reply(`❌ Download Failed: ${err.message}`);
    }
});
