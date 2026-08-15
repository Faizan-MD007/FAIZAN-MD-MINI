const { cmd } = require('../arslan');
const axios = require('axios');
const config = require('../config');
const { sendBtns } = require('../lib/buttons');

// =================== FAIZAN-MD STYLE ===================
function faizanStyle(title, value, status) {
    return `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❖ 📸 ${title}:* ${value}
*│❖ ✨️ 𝐒𝐭𝐚𝐭𝐮𝐬:* ${status}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.DESCRIPTION || '𝆸𝆰𝆴𝆸𝆰𝆴 𝆵𝆰 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🍍'}
`;
}

// Same cleanup rule as tt.js's copy-caption button: strip #tags, collapse the
// double-spaces they leave behind, keep the plain title text as-is
// (Urdu or English) and nothing else appended.
function cleanCaption(text) {
    if (!text) return '';
    return text.replace(/#[^\s#]+/g, '').replace(/\s{2,}/g, ' ').trim();
}

// =================== FAIZAN API (Instagram) ===================
const INSTA_API = 'https://faizan-api.vercel.app/api/instagram';

async function fetchInstagram(url) {
    const res = await axios.get(INSTA_API, {
        params: { url },
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = res.data;
    if (!data?.status) throw new Error('API returned failure status');
    return {
        videoUrl: data?.video,
        audioUrl: data?.mp3,
        username: data?.username ? data.username.replace(/\n/g, '').trim() : 'Unknown',
        caption: data?.caption || data?.title || ''
    };
}

cmd({
    pattern: 'instagram',
    alias: ['ig', 'igdl', 'insta', 'reels'],
    desc: 'Download Instagram Reels / Posts / Videos',
    category: 'download',
    react: '📸',
    filename: __filename
},
async (conn, mek, m, { from, q, args, reply, prefix }) => {
    try {
        // ─ Usage check
        if (!q) {
            return reply(faizanStyle(
                'INSTAGRAM DL',
                'Please provide an Instagram link\n*Example:* .ig https://www.instagram.com/reel/...',
                '❌'
            ));
        }

        const url = args.find(a => a.includes('instagram.com'));
        if (!url) {
            return reply(faizanStyle('INSTAGRAM DL', 'Invalid or missing Instagram link', '❌'));
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const info = await fetchInstagram(url);
        const caption = cleanCaption(info.caption) || `@${info.username}`;

        const infoText = faizanStyle('INSTAGRAM', `@${info.username}`, '✅ Ready — pick an option below');

        // 3 buttons as requested (same shape as tt.js): VIDEO / AUDIO download
        // via the hidden igrab handler; COPY CAPTION copies the plain caption
        // text directly (no #tags, nothing else appended).
        try {
            await sendBtns(conn, from, {
                title: '📸 INSTAGRAM',
                text: infoText,
                buttons: [
                    { display_text: '🎬 VIDEO', id: `${prefix}igrab ${url} video` },
                    { display_text: '🎵 AUDIO', id: `${prefix}igrab ${url} audio` },
                    { display_text: '📋 COPY CAPTION', copy_code: caption }
                ]
            }, mek);
        } catch (e) {
            // Fallback: no buttons available -> send the video directly, as before.
            if (!info.videoUrl) throw new Error('No video URL found in response');
            await conn.sendMessage(from, {
                video: { url: info.videoUrl },
                mimetype: 'video/mp4',
                caption: infoText
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error('Instagram DL error:', err.message);
        const errMsg = err.response?.data?.message || err.message || 'Download failed';
        await reply(faizanStyle('INSTAGRAM', errMsg, '❌'));
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});

// ============ HIDDEN: ACTUAL VIDEO/AUDIO DOWNLOAD, TRIGGERED BY BUTTON TAP ============
cmd({
    pattern: "igrab",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (!args.length) return;
    const url = args[0];
    const wantAudio = (args[1] || '').toLowerCase() === 'audio';
    try {
        const info = await fetchInstagram(url);
        if (wantAudio) {
            if (!info.audioUrl) throw new Error('No audio URL found in response');
            await conn.sendMessage(from, {
                audio: { url: info.audioUrl },
                mimetype: 'audio/mpeg',
                caption: faizanStyle('INSTAGRAM AUDIO', `@${info.username}`, '✅ Downloaded')
            }, { quoted: mek });
        } else {
            if (!info.videoUrl) throw new Error('No video URL found in response');
            await conn.sendMessage(from, {
                video: { url: info.videoUrl },
                mimetype: 'video/mp4',
                caption: faizanStyle('INSTAGRAM', `@${info.username}`, '✅ Downloaded')
            }, { quoted: mek });
        }
    } catch (err) {
        reply(faizanStyle('INSTAGRAM', err.message || 'Download failed', '❌'));
    }
});
