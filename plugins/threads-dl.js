const { cmd } = require('../arslan');
const axios = require('axios');
const { sendBtns } = require('../lib/buttons');
const config = require('../config');

const THREADS_API_URL = 'https://api.qasimdev.dpdns.org/api/threads/download';
const THREADS_API_KEY = process.env.QASIM_API_KEY || process.env.API_KEY || 'qasim-dev';
const THREADS_HOST_PATTERN = /(?:threads\.net|threads\.com)/i;
const pendingThreads = new Map();
const PENDING_TTL_MS = 10 * 60 * 1000;

function createThreadToken(from, url) {
    const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    pendingThreads.set(`${from}:${token}`, { url, expiresAt: Date.now() + PENDING_TTL_MS });
    for (const [key, item] of pendingThreads) {
        if (!item || item.expiresAt < Date.now()) pendingThreads.delete(key);
    }
    return token;
}

function resolveThreadUrl(from, value) {
    if (THREADS_HOST_PATTERN.test(value || '')) return value;
    const item = pendingThreads.get(`${from}:${value}`);
    if (!item || item.expiresAt < Date.now()) return '';
    return item.url;
}

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
    const payload = Array.isArray(result) ? result[0] : result;
    const direct = type === 'video'
        ? [payload?.video_url, payload?.video, payload?.download_url, payload?.video_download_url]
        : [];
    const generic = [payload?.download_url, payload?.media_url, payload?.url, payload?.media];
    return mediaUrlValue(firstMediaUrl(...direct, ...generic));
}

function getThreadsCaption(result) {
    const payload = Array.isArray(result) ? result[0] : result;
    const candidates = [
        payload?.caption,
        payload?.text,
        payload?.description,
        payload?.title,
        payload?.post?.caption,
        payload?.post?.text,
        payload?.data?.caption
    ];
    return candidates.find((value) => typeof value === 'string' && value.trim()) ||
        'Threads caption is not available for this post.';
}

cmd({
    pattern: "threads",
    alias: ["thread", "thdl"],
    desc: "Download Threads video or caption",
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

        // Validate the URL before creating a short, reliable button payload.
        await fetchThreadsMedia(url);
        const token = createThreadToken(from, url);

        const infoText = `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 🧵 𝐓𝐢𝐭𝐥𝐞:* Threads Video / Caption
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* Ready
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.BOT_FOOTER || 'ᴘᴏᴡᴇʀᴇ∂ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍'}`;

        await sendBtns(conn, from, {
            title: '🧵 THREADS DOWNLOADER',
            text: infoText,
            buttons: [
                { display_text: '🎬 𝐕ι∂єσ', id: `${prefix}thgrab ${token} video` },
                { display_text: '📝 𝐂αρтιση', id: `${prefix}thgrab ${token} caption` }
            ]
        }, mek);

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error("Threads DL Error:", err);
        reply("❌ Download failed. Please make sure the link is public and try again.");
    }
});

// Hidden handler for the actual video/caption action.
cmd({
    pattern: "thgrab",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (!args.length) return;

    const url = resolveThreadUrl(from, args[0]);
    const mediaType = (args[1] || 'video').toLowerCase() === 'caption' ? 'caption' : 'video';
    if (!url) return reply('❌ This Threads menu expired. Send the Threads link again.');

    try {
        await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });

        const result = await fetchThreadsMedia(url);
        if (mediaType === 'caption') {
            await conn.sendMessage(from, {
                text: `*🧵 THREADS CAPTION*\n\n${getThreadsCaption(result)}\n\n${config.BOT_FOOTER || ''}`
            }, { quoted: mek });
        } else {
            const mediaUrl = getMediaUrl(result, 'video');
            if (!mediaUrl) throw new Error('No video URL found in API response');
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
