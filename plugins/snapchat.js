const { cmd } = require('../arslan');
const axios = require('axios');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { sendBtns } = require('../lib/buttons');

ffmpeg.setFfmpegPath(ffmpegPath);

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

function faizanStyle(title, value, status) {
    return `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 👻 ${title}:* ${value}
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* ${status}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.DESCRIPTION || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍'}
`;
}

// Same cleanup rule as tt.js's copy-caption button: strip #tags, collapse the
// double-spaces they leave behind, keep the plain text as-is.
function cleanCaption(text) {
    if (!text) return '';
    return text.replace(/#[^\s#]+/g, '').replace(/\s{2,}/g, ' ').trim();
}

async function fetchSnapchat(url) {
    const apiUrl = `https://api.qasimdev.dpdns.org/api/download/snapchat?url=${encodeURIComponent(url)}&apiKey=qasim-dev`;
    const response = await axios.get(apiUrl, { timeout: 30000 });
    const data = response.data;
    if (!data?.success || !data?.data?.result || !data.data.result.length) {
        throw new Error('No video found');
    }
    const item = data.data.result[0];
    if (!item.video) throw new Error('No download URL found');
    return {
        videoUrl: item.video,
        // Qasim's Snapchat endpoint doesn't always return a caption/title field
        // -- check the common alternates, fall back to a plain label rather
        // than copying nothing.
        caption: item.caption || item.title || item.text || 'Snapchat Video'
    };
}

// Snapchat clips have no separate audio-only source from this API -- extract
// the audio track locally with ffmpeg, same tool other plugins already use.
async function extractAudio(videoUrl) {
    const tempInput = path.join(tempDir, `snap_in_${Date.now()}.mp4`);
    const tempOutput = path.join(tempDir, `snap_out_${Date.now()}.mp3`);
    const writer = fs.createWriteStream(tempInput);
    const response = await axios({ url: videoUrl, method: 'GET', responseType: 'stream', timeout: 30000 });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
    await new Promise((resolve, reject) => {
        ffmpeg(tempInput).noVideo().audioCodec('libmp3lame').output(tempOutput)
            .on('end', resolve).on('error', reject).run();
    });
    try { fs.unlinkSync(tempInput); } catch (_) {}
    return tempOutput;
}

cmd({
    pattern: "snapchat",
    alias: ["snap", "snp", "snapdl"],
    desc: "Download Snapchat videos",
    category: "download",
    react: "👻",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, prefix }) => {
    try {
        if (!q) {
            return reply(faizanStyle('SNAPCHAT', 'Please provide Snapchat video link\nExample: .snap https://www.snapchat.com/...', '❌'));
        }

        if (!/snapchat\.com/i.test(q)) {
            return reply(faizanStyle('SNAPCHAT', 'Invalid Snapchat link', '❌'));
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const info = await fetchSnapchat(q);
        const caption = cleanCaption(info.caption) || 'Snapchat Video';
        const infoText = faizanStyle('SNAPCHAT', 'Ready — pick an option below', '✅');

        // 3 buttons as requested (same shape as tt.js): VIDEO downloads the
        // clip; AUDIO extracts its audio track (ffmpeg, no separate source
        // exists from this API); COPY CAPTION copies the plain text directly.
        try {
            await sendBtns(conn, from, {
                title: '👻 SNAPCHAT',
                text: infoText,
                buttons: [
                    { display_text: '🎬 𝐕ι∂єσ', id: `${prefix}snapgrab ${q} video` },
                    { display_text: '🎵 𝐀υ∂ιο', id: `${prefix}snapgrab ${q} audio` },
                    { display_text: '📋 𝐂σρу 𝐂αρтισɴ', copy_code: caption }
                ]
            }, mek);
        } catch (e) {
            // Fallback: no buttons available -> send the video directly, as before.
            await conn.sendMessage(from, {
                video: { url: info.videoUrl },
                mimetype: 'video/mp4',
                caption: faizanStyle('SNAPCHAT', 'Snapchat Video Ready', '✅')
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error('Snapchat downloader error:', err);
        const errorMsg = err.response?.data?.message || err.message || 'Download failed';
        await reply(faizanStyle('SNAPCHAT', errorMsg, '❌'));
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});

// ============ HIDDEN: ACTUAL VIDEO/AUDIO DOWNLOAD, TRIGGERED BY BUTTON TAP ============
cmd({
    pattern: "snapgrab",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (args.length < 2) return;
    // The Snapchat URL itself may contain query params with '&' etc, but arg
    // splitting is on spaces only so args[0] is the whole URL and the mode
    // flag is always the last token.
    const mode = args[args.length - 1].toLowerCase();
    const url = args.slice(0, -1).join(' ');
    try {
        const info = await fetchSnapchat(url);
        if (mode === 'audio') {
            await conn.sendMessage(from, { react: { text: '🎵', key: mek.key } });
            const audioPath = await extractAudio(info.videoUrl);
            await conn.sendMessage(from, {
                audio: { url: audioPath },
                mimetype: 'audio/mpeg',
                caption: faizanStyle('SNAPCHAT AUDIO', 'Extracted from video', '✅')
            }, { quoted: mek });
            try { fs.unlinkSync(audioPath); } catch (_) {}
        } else {
            await conn.sendMessage(from, {
                video: { url: info.videoUrl },
                mimetype: 'video/mp4',
                caption: faizanStyle('SNAPCHAT', 'Snapchat Video Ready', '✅')
            }, { quoted: mek });
        }
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (err) {
        reply(faizanStyle('SNAPCHAT', err.message || 'Download failed', '❌'));
    }
});
