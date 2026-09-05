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

function getPayload(result) {
    if (Array.isArray(result)) return result[0] || {};
    return result?.data && typeof result.data === 'object' ? result.data : (result || {});
}

function getMediaUrl(result) {
    const payload = getPayload(result);
    const videos = Array.isArray(payload.videos) ? payload.videos : [];
    const videoCandidates = videos.flatMap((item) => [
        item?.directUrl,
        item?.directDownload,
        item?.download,
        item?.url
    ]);
    return mediaUrlValue(firstMediaUrl(
        ...videoCandidates,
        payload.video_url,
        payload.video,
        payload.videoUrl,
        payload.directDownload,
        payload.download
    ));
}

function getThreadsCaption(result) {
    const payload = getPayload(result);
    const candidates = [
        payload.description,
        payload.caption,
        payload.text,
        payload.title,
        payload.post?.caption,
        payload.post?.text
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

        // Read the API response once. It contains data.videos[] and description.
        const result = await fetchThreadsMedia(url);
        const token = createThreadToken(from, url);
        const caption = getThreadsCaption(result);

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
                { display_text: '🎬 𝐕ι∂єσ', id: `${prefix}thgrab ${token}` },
                { display_text: '📋 𝐂σρу Cαρтιση', copy_code: caption }
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
    if (!url) return reply('❌ This Threads menu expired. Send the Threads link again.');

    try {
        await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });

        const result = await fetchThreadsMedia(url);
        const mediaUrl = getMediaUrl(result);
        if (!mediaUrl) throw new Error('No video found in this Threads share post');
        await conn.sendMessage(from, {
            video: { url: mediaUrl },
            mimetype: "video/mp4",
            caption: `*🧵 THREADS VIDEO DOWNLOADED*\n\n${config.BOT_FOOTER || ''}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } catch (err) {
        console.error("Threads Grab Error:", err);
        reply(`❌ Download Failed: ${err.message}`);
    }
});
