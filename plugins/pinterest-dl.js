const { cmd } = require('../arslan');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const config = require('../config');
const { sendBtns } = require('../lib/buttons');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

function faizanStyle(title, value, status) {
    return `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 📌 ${title}:* ${value}
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* ${status}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.DESCRIPTION || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍'}
`;
}

async function resolveDownloadUrl(url) {
    const apiUrl = `https://api.qasimdev.dpdns.org/api/download/pinterest?url=${encodeURIComponent(url)}&apiKey=qasim-dev`;
    const res = await axios.get(apiUrl, { timeout: 30000 });
    const data = res.data;
    if (!data?.success || !data?.data?.download_url) {
        throw new Error('No download URL found');
    }
    return data.data.download_url;
}

async function downloadAndConvert(videoUrl) {
    const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 });
    let videoBuffer = Buffer.from(videoRes.data);

    // FFmpeg - Convert to proper format
    try {
        const tempInput = path.join(tempDir, `temp_pin_${Date.now()}.mp4`);
        const tempOutput = path.join(tempDir, `final_pin_${Date.now()}.mp4`);

        fs.writeFileSync(tempInput, videoBuffer);

        await new Promise((resolve, reject) => {
            ffmpeg(tempInput)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')
                .outputOptions(['-movflags', '+faststart'])
                .on('end', resolve)
                .on('error', reject)
                .save(tempOutput);
        });

        videoBuffer = fs.readFileSync(tempOutput);

        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);

        console.log(`[PINTEREST] FFmpeg conversion successful`);
    } catch (ffErr) {
        console.log(`[PINTEREST] FFmpeg conversion skipped: ${ffErr.message}`);
    }

    return videoBuffer;
}

// Pinterest videos have no separate audio-only source -- extract the audio
// track locally with ffmpeg, same approach as snapchat.js.
async function extractAudio(videoUrl) {
    const tempInput = path.join(tempDir, `pin_in_${Date.now()}.mp4`);
    const tempOutput = path.join(tempDir, `pin_out_${Date.now()}.mp3`);
    const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 });
    fs.writeFileSync(tempInput, Buffer.from(videoRes.data));
    await new Promise((resolve, reject) => {
        ffmpeg(tempInput).noVideo().audioCodec('libmp3lame').output(tempOutput)
            .on('end', resolve).on('error', reject).run();
    });
    try { fs.unlinkSync(tempInput); } catch (_) {}
    return tempOutput;
}

cmd({
    pattern: "pinterest",
    alias: ["pin", "pindl"],
    desc: "Download Pinterest videos",
    category: "download",
    react: "📌",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, prefix }) => {
    try {
        if (!q) {
            return reply(faizanStyle('PINTEREST', 'Please provide Pinterest link\nExample: .pin https://pin.it/xxxxx', '❌'));
        }

        if (!/pinterest\.com|pin\.it/i.test(q)) {
            return reply(faizanStyle('PINTEREST', 'Invalid Pinterest link', '❌'));
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Resolve early just to fail fast on a bad/expired link before
        // showing buttons for a download that can't succeed.
        await resolveDownloadUrl(q);

        const infoText = faizanStyle('PINTEREST', 'Ready — pick an option below', '✅');

        // 2 buttons as requested: VIDEO / AUDIO, both routed through the
        // hidden pingrab handler.
        try {
            await sendBtns(conn, from, {
                title: '📌 PINTEREST',
                text: infoText,
                buttons: [
                    { display_text: '🎬 VIDEO', id: `${prefix}pingrab ${q} video` },
                    { display_text: '🎵 AUDIO', id: `${prefix}pingrab ${q} audio` }
                ]
            }, mek);
        } catch (e) {
            // Fallback: no buttons available -> send the video directly, as before.
            const downloadUrl = await resolveDownloadUrl(q);
            const videoBuffer = await downloadAndConvert(downloadUrl);
            await conn.sendMessage(from, {
                video: videoBuffer,
                mimetype: 'video/mp4',
                caption: faizanStyle('PINTEREST', 'Video Ready', '✅')
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error('Pinterest downloader error:', err);
        const errorMsg = err.response?.data?.message || err.message || 'Download failed';
        await reply(faizanStyle('PINTEREST', errorMsg, '❌'));
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});

// ============ HIDDEN: ACTUAL VIDEO/AUDIO DOWNLOAD, TRIGGERED BY BUTTON TAP ============
cmd({
    pattern: "pingrab",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (args.length < 2) return;
    const mode = args[args.length - 1].toLowerCase();
    const url = args.slice(0, -1).join(' ');
    try {
        const downloadUrl = await resolveDownloadUrl(url);

        if (mode === 'audio') {
            await conn.sendMessage(from, { react: { text: '🎵', key: mek.key } });
            const audioPath = await extractAudio(downloadUrl);
            await conn.sendMessage(from, {
                audio: { url: audioPath },
                mimetype: 'audio/mpeg',
                caption: faizanStyle('PINTEREST AUDIO', 'Extracted from video', '✅')
            }, { quoted: mek });
            try { fs.unlinkSync(audioPath); } catch (_) {}
        } else {
            const videoBuffer = await downloadAndConvert(downloadUrl);
            await conn.sendMessage(from, {
                video: videoBuffer,
                mimetype: 'video/mp4',
                caption: faizanStyle('PINTEREST', 'Video Ready', '✅')
            }, { quoted: mek });
        }
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (err) {
        reply(faizanStyle('PINTEREST', err.message || 'Download failed', '❌'));
    }
});
