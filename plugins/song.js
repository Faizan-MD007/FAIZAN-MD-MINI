const { cmd } = require("../arslan");
const config = require('../config');
const axios = require('axios');
const yts = require('yt-search');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');

// =================== FFMPEG SETUP ===================
ffmpeg.setFfmpegPath(ffmpegPath);

// =================== TEMP DIRECTORY ===================
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// =================== FAIZAN-MD STYLE ===================
function faizanStyle(title, value, status, quality = "", duration = "") {
    return `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅αɪᴢαɴ-𝐌ᴅ⎯꯭̽'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❖ 🍵 ${title}:* ${value}
*│❖ 🌧 𝐐𝐮𝐚𝐥𝐢𝐭𝐲:* ${quality}
*│❖ ⏱️ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧:* ${duration}
*│❖ ✨ 𝐒𝐭𝐚𝐭𝐮𝐬:* ${status}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ${config.DESCRIPTION || '𝆸𝆰𝆴𝆸𝆰𝆴 𝆵𝆰 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🍍'}
`;
}

// =================== FAIZAN API (ytdl - YouTube Legacy) ===================
const FAIZAN_API = "https://faizan-api.vercel.app/api/ytdl";

async function downloadWithFaizan(url, type = 'mp3') {
    try {
        const response = await axios.get(FAIZAN_API, {
            params: { url, type },
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const data = response.data;

        if (data?.status === true) {
            if (type === 'mp3' && data?.result?.audio_download) {
                return {
                    success: true,
                    downloadUrl: data.result.audio_download,
                    title: data.result.title || 'Audio',
                    duration: data.result.duration ? `${data.result.duration}s` : 'Unknown',
                    quality: '128kbps'
                };
            } else if (type === 'mp4' && data?.result?.video_download) {
                return {
                    success: true,
                    downloadUrl: data.result.video_download,
                    title: data.result.title || 'Video',
                    duration: data.result.duration ? `${data.result.duration}s` : 'Unknown',
                    quality: '360p'
                };
            }
        }
        return { success: false, error: 'No download link found' };
    } catch (err) {
        console.error('Faizan API Error:', err.message);
        return { success: false, error: err.message };
    }
}

// =================== GET VIDEO URL (NAME OR LINK) ===================
async function getVideoUrl(query) {
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
        const videoId = query.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/)?.[1];
        if (videoId) {
            const search = await yts({ videoId });
            return {
                url: query,
                title: search?.title || 'YouTube Video',
                thumbnail: search?.thumbnail || null,
                duration: search?.timestamp || 'Unknown'
            };
        }
        return { url: query, title: 'YouTube Video', thumbnail: null, duration: 'Unknown' };
    }

    const search = await yts(query);
    if (!search.videos || search.videos.length === 0) {
        throw new Error("No results found");
    }
    const video = search.videos[0];
    return {
        url: video.url,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.timestamp
    };
}

// =================== DOWNLOAD URL TO TEMP FILE ===================
async function downloadToFile(url, filePath) {
    const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 60000 });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// =================== FFMPEG: CONVERT + APPLY EFFECT ===================
async function convertToOpus(inputPath, outputPath, effect = null) {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath);
        if (effect) {
            switch (effect) {
                case 'fast':    command.audioFilters('atempo=1.5'); break;
                case 'slow':    command.audioFilters('atempo=0.8'); break;
                case 'bass':    command.audioFilters('bass=g=10'); break;
                case 'volume':  command.audioFilters('volume=2.0'); break;
                case 'reverse': command.audioFilters('areverse'); break;
            }
        }
        command
            .audioCodec('libopus')
            .audioChannels(1)
            .audioFrequency(48000)
            .format('ogg')
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', reject)
            .run();
    });
}

// =================== CLEANUP TEMP FILES ===================
function cleanTemp(...files) {
    for (const f of files) {
        try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
    }
}

// =================== MAIN COMMAND ===================
cmd({
    pattern: "song",
    alias: ["play", "music", "audio", "yta", "mp3"],
    desc: "Download audio/video from YouTube with buttons",
    category: "download",
    react: "🍵",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, prefix }) => {
    try {
        if (!args.length) {
            return reply(`*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍 𝐌𝐄𝐍𝐔'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❖ 📝 Usage:* .song <name or link>
*│❖ 📗 Example:* .song Believer Imagine Dragons
*│❖ ✨ Effects:* fast, slow, bass, volume, reverse
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> *𝐏𝐫𝐨𝐯𝐢𝐝𝐞𝐝 𝐁𝐲 𝐅𝐚𝐢𝐳𝐚𝐧-𝐌𝐝 🍵*`);
        }

        let query = args.join(" ");
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Get video URL and info
        const videoInfo = await getVideoUrl(query);

        const buttonText = `
----------------------------
. | 🎹 SELECT VIDEO QUALITY
----------------------------
${config.BOT_NAME || 'FAIZAN-MD'} DOWNLOADER
`;

        const buttons = [
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🎵 AUDIO",
                    id: `${prefix}downaudio ${videoInfo.url}`
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🎥 HD",
                    id: `${prefix}downvideo ${videoInfo.url}`
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "📺 SD",
                    id: `${prefix}downvideo ${videoInfo.url}`
                })
            }
        ];

        let headerImage = null;
        if (videoInfo.thumbnail) {
            try {
                const media = await prepareWAMessageMedia({ image: { url: videoInfo.thumbnail } }, { upload: conn.waUploadToServer });
                headerImage = media.imageMessage;
            } catch (e) {
                console.error("Media preparation failed:", e);
            }
        }

        const interactiveMessage = {
            body: { text: buttonText },
            footer: { text: config.BOT_FOOTER || "> *𝐏σωєяє∂ 𝐁у 𝐅αɪᴢαɴ-𝐌ᴅ⎯꯭̽🩷*" },
            header: {
                title: videoInfo.title,
                hasMediaAttachment: !!headerImage,
                imageMessage: headerImage
            },
            nativeFlowMessage: {
                buttons: buttons
            }
        };

        const message = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: interactiveMessage
                }
            }
        };

        await conn.relayMessage(from, message, { quoted: mek });

    } catch (err) {
        console.error('Song Error:', err.message);
        reply(faizanStyle('ERROR', err.message || 'Search failed.', '❌', '—', '—'));
    }
});

// =================== DOWNLOAD HANDLERS ===================

cmd({
    pattern: "downaudio",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (!args.length) return;
    const url = args[0];
    const tempInput = path.join(tempDir, `input_${Date.now()}.mp3`);
    const tempOutput = path.join(tempDir, `output_${Date.now()}.ogg`);

    try {
        await conn.sendMessage(from, { react: { text: '📥', key: mek.key } });
        let result = await downloadWithFaizan(url, 'mp3');
        if (!result.success) throw new Error(result.error || "Download failed");

        await downloadToFile(result.downloadUrl, tempInput);
        await convertToOpus(tempInput, tempOutput);

        await conn.sendMessage(from, {
            audio: { url: tempOutput },
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            fileName: `${result.title}.ogg`,
            caption: faizanStyle('SONG', result.title, '✅', result.quality, result.duration)
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (err) {
        reply(`❌ Error: ${err.message}`);
    } finally {
        cleanTemp(tempInput, tempOutput);
    }
});

cmd({
    pattern: "downvideo",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (!args.length) return;
    const url = args[0];

    try {
        await conn.sendMessage(from, { react: { text: '🎥', key: mek.key } });
        let result = await downloadWithFaizan(url, 'mp4');
        if (!result.success) throw new Error(result.error || "Download failed");

        await conn.sendMessage(from, {
            video: { url: result.downloadUrl },
            mimetype: 'video/mp4',
            caption: faizanStyle('VIDEO', result.title, '✅', result.quality, result.duration)
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (err) {
        reply(`❌ Error: ${err.message}`);
    }
});
