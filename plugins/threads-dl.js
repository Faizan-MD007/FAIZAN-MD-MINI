const { cmd } = require('../arslan');
const axios = require('axios');
const { sendBtns } = require('../lib/buttons');
const config = require('../config');

const THREADS_API_URL = 'https://api.qasimdev.dpdns.org/api/threads/download';
const THREADS_API_KEY = process.env.QASIM_API_KEY || process.env.API_KEY || 'qasim-dev';
const THREADS_HOST_PATTERN = /(?:threads\.net|threads\.com)/i;

const firstMediaUrl = (...values) => values.find((value) => {
    if (typeof value === 'string') return /^https?:\/\//i.test(value);
    return value && typeof value.url === 'string' && /^https?:\/\//i.test(value.url);
});

const mediaUrlValue = (value) => typeof value === 'string' ? value : value?.url;

async function fetchThreadsMedia(url) {
    const { data } = await axios.get(THREADS_API_URL, {
        params: { url, apiKey: THREADS_API_KEY },
        timeout: 45000
    });

    if (!data || data.success === false) {
        throw new Error(data?.message || data?.error || 'Threads API request failed');
    }

    const result = data.result || data.data || data;
    if (!result) throw new Error('Threads API returned no media');
    return result;
}

function getMediaUrl(result, type) {
    const direct = type === 'image'
        ? [result.image_url, result.image, result.photo_url, result.photo, result.picture]
        : [result.video_url, result.video, result.download_url, result.video_download_url];

    const generic = [result.download_url, result.media_url, result.url, result.media];
    return mediaUrlValue(firstMediaUrl(...direct, ...generic));
}

cmd({
    pattern: "threads",
    alias: ["thread", "thdl"],
    desc: "Download Threads videos and images",
    react: "🧵",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, args, reply, prefix }) => {
    try {
        const url = args[0] || (m.quoted && m.quoted.text);
        if (!url || !THREADS_HOST_PATTERN.test(url)) {
            return reply("❌ Please provide a valid Threads URL");
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Validate the URL through the same API used by the download buttons.
        await fetchThreadsMedia(url);

        const infoText = `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 🧵 𝐓𝐢𝐭𝐥𝐞:* Threads Media
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* Ready
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.BOT_FOOTER || 'ᴘᴏᴡᴇʀᴇ∂ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍'}`;

        await sendBtns(conn, from, {
            title: '🧵 THREADS DOWNLOADER',
            text: infoText,
            buttons: [
                { display_text: '🎬 𝐕ι∂єσ', id: `${prefix}thgrab ${url} video` },
                { display_text: '🖼️ 𝐈мαgє', id: `${prefix}thgrab ${url} image` }
            ]
        }, mek);

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error("Threads DL Error:", err);
        reply("❌ Download failed. Please make sure the link is public and try again.");
    }
});

// Hidden handler for the actual video/image download.
cmd({
    pattern: "thgrab",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (!args.length) return;

    const url = args[0];
    const mediaType = (args[1] || 'video').toLowerCase() === 'image' ? 'image' : 'video';

    try {
        await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });

        const result = await fetchThreadsMedia(url);
        const mediaUrl = getMediaUrl(result, mediaType);
        if (!mediaUrl) throw new Error(`No ${mediaType} URL found in API response`);

        if (mediaType === 'image') {
            await conn.sendMessage(from, {
                image: { url: mediaUrl },
                caption: `*🧵 THREADS IMAGE DOWNLOADED*\n\n${config.BOT_FOOTER || ''}`
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                video: { url: mediaUrl },
                mimetype: "video/mp4",
                caption: `*🧵 THREADS VIDEO DOWNLOADED*\n\n${config.BOT_FOOTER || ''}`
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } catch (err) {
        console.error("Threads Grab Error:", err);
        reply(`❌ Download Failed: ${err.message}`);
    }
});
