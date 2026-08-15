const { cmd } = require("../arslan");
const config = require('../config');
const axios = require('axios');
const yts = require('yt-search');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { sendBtns } = require('../lib/buttons');

// ============ FFMPEG PATH SET ============
ffmpeg.setFfmpegPath(ffmpegPath);

// ============ TEMP DIRECTORY ============
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// ============ FAIZAN-MD STYLE ============
function faizanStyle(title, value, status, quality = "", duration = "", views = "") {
    return `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 🎬 ${title}:* ${value}
*│❀ 🎚️ 𝐐𝐮𝐚𝐥𝐢𝐭𝐲:* ${quality}
*│❀ ⏱️ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧:* ${duration}
*│❀ 👁️ 𝐕𝐢𝐞𝐰𝐬:* ${views}
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* ${status}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

 ${config.DESCRIPTION}
`;
}

// ============ APIs (MULTIPLE FALLBACKS) ============
const APIS = {
    arslan: async (url, type) => {
        try {
            const endpoint = type === 'video' ? 'ytmp4' : 'ytmp3';
            const response = await axios.get(`https://arslan-apis-v2.vercel.app/download/${endpoint}`, {
                params: { url: url },
                timeout: 30000
            });
            if (response.data?.status === true && response.data?.result?.download?.url) {
                return {
                    success: true,
                    downloadUrl: response.data.result.download.url,
                    title: response.data.result.metadata?.title || 'Media',
                    quality: response.data.result.metadata?.quality || (type === 'video' ? '360p' : '128kbps')
                };
            }
            return { success: false };
        } catch (e) {
            return { success: false };
        }
    },
    eliteProTech: async (url, type) => {
        try {
            const format = type === 'video' ? 'mp4' : 'mp3';
            const response = await axios.get(`https://eliteprotech-apis.zone.id/ytdown`, {
                params: { url: url, format: format },
                timeout: 30000
            });
            if (response.data?.success && response.data?.downloadURL) {
                return {
                    success: true,
                    downloadUrl: response.data.downloadURL,
                    title: response.data.title || 'Media',
                    quality: type === 'video' ? '720p' : '320kbps'
                };
            }
            return { success: false };
        } catch (e) {
            return { success: false };
        }
    },
    gifted: async (url, type) => {
        try {
            const endpoint = type === 'video' ? 'ytmp4v2' : 'ytmp3v2';
            const response = await axios.get(`https://api.giftedtech.co.ke/api/download/${endpoint}`, {
                params: { apikey: 'gifted', url: url },
                timeout: 30000
            });
            if (response.data?.success && response.data?.result?.download_url) {
                return {
                    success: true,
                    downloadUrl: response.data.result.download_url,
                    title: response.data.result.title,
                    quality: response.data.result.quality || (type === 'video' ? '720p' : '320kbps')
                };
            }
            return { success: false };
        } catch (e) {
            return { success: false };
        }
    }
};

// ============ SEARCH VIDEO ============
async function searchVideo(query) {
    const search = await yts(query);
    if (!search.videos || search.videos.length === 0) throw new Error("No results found");
    return search.videos[0];
}

// ============ FFMPEG TRIM FUNCTION ============
async function trimVideo(inputPath, outputPath, start, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(duration)
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', reject)
            .run();
    });
}

// ============ RUN FALLBACK APIS IN ORDER ============
async function fetchVideoDownload(videoUrl) {
    let result = null;
    for (const [name, apiFn] of Object.entries(APIS)) {
        try {
            console.log(`[VIDEO] Trying ${name}...`);
            result = await apiFn(videoUrl, 'video');
            if (result.success && result.downloadUrl) {
                console.log(`[VIDEO] ✅ ${name} success`);
                return result;
            }
        } catch (e) {}
    }
    return null;
}

// ============ MAIN VIDEO COMMAND ============
// Same interactive shape as song.js: fetch info, then let the user pick a
// quality via buttons instead of downloading immediately — trim mode is the
// one exception, since a trim range is already a fully-specified request.
cmd({
    pattern: "video",
    alias: ["ytv", "video3", "video2", "video4"],
    desc: "Download YouTube video using multiple APIs",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, args, reply, prefix }) => {
    try {
        if (!args.length) {
            return reply(`*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 🎬 𝐕𝐈𝐃𝐄𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 🎬 ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 📝 *Usage:* ._avideo <name or link>_
*│❀ 🎵 *Example:* ._avideo jutt gang_
*│❀ 🔗 *By Link:* ._avideo https://youtu.be/xxxxx_
*│❀ ✂️ *Trim:* ._avideo <link> trim <start> <duration>_
*│❀   e.g., ._avideo link trim 00:00:10 00:00:30_
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> *𝐏𝐫𝐨𝐯𝐢𝐝𝐞 𝐬𝐨𝐧𝐠 𝐧𝐚𝐦𝐞 𝐨𝐫 𝐥𝐢𝐧𝐤⎯꯭̽* 🎬`);
        }

        let query = args.join(" ");
        let trimStart = null;
        let trimDuration = null;

        // Check for trim command
        if (args.includes("trim")) {
            const trimIndex = args.indexOf("trim");
            if (args.length > trimIndex + 2) {
                trimStart = args[trimIndex + 1];
                trimDuration = args[trimIndex + 2];
                query = args.slice(0, trimIndex).join(" ");
            }
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Get video URL and info
        let videoUrl, videoTitle, videoThumb, videoDuration, videoViews;

        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            videoUrl = query;
            try {
                const videoId = videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/)?.[1];
                if (videoId) {
                    const search = await yts({ videoId });
                    if (search) {
                        videoTitle = search.title;
                        videoThumb = search.thumbnail;
                        videoDuration = search.timestamp;
                        videoViews = search.views;
                    }
                }
            } catch(e) {}
        } else {
            const searchResult = await searchVideo(query);
            videoUrl = searchResult.url;
            videoTitle = searchResult.title;
            videoThumb = searchResult.thumbnail;
            videoDuration = searchResult.timestamp;
            videoViews = searchResult.views;
        }

        if (!videoTitle) videoTitle = "Video";

        // ============ TRIM MODE: unchanged, immediate download+trim+send ============
        if (trimStart && trimDuration) {
            if (videoThumb) {
                await conn.sendMessage(from, {
                    image: { url: videoThumb },
                    caption: faizanStyle('VIDEO INFO', `${videoTitle.substring(0, 60)}`, '⏳ Processing', 'Fetching...', videoDuration || 'Unknown', videoViews || 'N/A')
                }, { quoted: mek });
            }

            const result = await fetchVideoDownload(videoUrl);
            if (!result || !result.downloadUrl) throw new Error("All APIs failed");

            await conn.sendMessage(from, { react: { text: "✂️", key: mek.key } });

            const tempInput = path.join(tempDir, `input_${Date.now()}.mp4`);
            const tempOutput = path.join(tempDir, `output_${Date.now()}.mp4`);

            const writer = fs.createWriteStream(tempInput);
            const response = await axios({ url: result.downloadUrl, method: 'GET', responseType: 'stream' });
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await trimVideo(tempInput, tempOutput, trimStart, trimDuration);

            await conn.sendMessage(from, {
                video: { url: tempOutput },
                mimetype: 'video/mp4',
                caption: faizanStyle('TRIMMED VIDEO', `${(result.title || videoTitle).substring(0, 100)}\n✂️ Trimmed: ${trimStart} to ${trimDuration}`, '✅', result.quality, videoDuration || 'Unknown', videoViews || 'N/A')
            }, { quoted: mek });

            fs.unlinkSync(tempInput);
            fs.unlinkSync(tempOutput);
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            return;
        }

        // ============ NORMAL MODE: show HD/SD buttons, same shape as song.js ============
        const buttonText = `
*${videoTitle}*

----------------------------
. | 🎬 SELECT VIDEO QUALITY
----------------------------
${config.BOT_NAME || 'FAIZAN-MD'} DOWNLOADER
`;

        const buttons = [
            { display_text: "🎥 HD", id: `${prefix}vidgrab ${videoUrl} hd` },
            { display_text: "📺 SD", id: `${prefix}vidgrab ${videoUrl} sd` }
        ];

        try {
            await sendBtns(conn, from, {
                title: "🎬 FAIZAN-MD",
                text: buttonText,
                footer: config.BOT_FOOTER,
                ...(videoThumb ? { image: { url: videoThumb } } : {}),
                buttons
            }, mek);
        } catch (e) {
            // Fallback: no buttons available -> download at default quality directly.
            await reply(faizanStyle('VIDEO INFO', videoTitle.substring(0, 60), '⏳ Processing', 'Fetching...', videoDuration || 'Unknown', videoViews || 'N/A'));
            const result = await fetchVideoDownload(videoUrl);
            if (!result || !result.downloadUrl) throw new Error("All APIs failed");
            await conn.sendMessage(from, {
                video: { url: result.downloadUrl },
                mimetype: 'video/mp4',
                caption: faizanStyle('VIDEO', (result.title || videoTitle).substring(0, 100), '✅', result.quality, videoDuration || 'Unknown', videoViews || 'N/A')
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error('Video Error:', err);
        reply(faizanStyle('VIDEO', err.message || 'Download failed', '❌', '—', '—', '—'));
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// ============ HIDDEN: ACTUAL DOWNLOAD, TRIGGERED BY THE HD/SD BUTTON TAP ============
cmd({
    pattern: "vidgrab",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    if (!args.length) return;
    const videoUrl = args[0];
    const wantSd = (args[1] || '').toLowerCase() === 'sd';
    try {
        await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });
        const result = await fetchVideoDownload(videoUrl);
        if (!result || !result.downloadUrl) throw new Error("All APIs failed");
        await conn.sendMessage(from, {
            video: { url: result.downloadUrl },
            mimetype: 'video/mp4',
            caption: faizanStyle('VIDEO', result.title || 'Video', '✅', wantSd ? `${result.quality} (SD)` : `${result.quality} (HD)`, '—', '—')
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } catch (err) {
        console.error('Vidgrab Error:', err);
        reply(faizanStyle('VIDEO', err.message || 'Download failed', '❌', '—', '—', '—'));
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// ============ VIDEO AS DOCUMENT (NO FFMPEG) ============
cmd({
    pattern: "videodoc",
    alias: ["vdoc", "docvideo"],
    desc: "Download video as document file",
    category: "download",
    react: "📄",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (!args.length) return reply("❌ Provide song name or link!\nExample: .avdoc Imagine Dragons Believer");

        let query = args.join(" ");
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        let videoUrl, videoTitle;
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            videoUrl = query;
        } else {
            const searchResult = await searchVideo(query);
            videoUrl = searchResult.url;
            videoTitle = searchResult.title;
        }

        const result = await fetchVideoDownload(videoUrl);
        if (!result || !result.downloadUrl) throw new Error("Download failed");

        const finalTitle = result.title || videoTitle || 'video';
        const safeFileName = finalTitle.replace(/[^\w\s-]/g, '').substring(0, 50);

        const { data: videoBuffer } = await axios.get(result.downloadUrl, { responseType: 'arraybuffer' });

        await conn.sendMessage(from, {
            document: Buffer.from(videoBuffer),
            mimetype: 'video/mp4',
            fileName: `${safeFileName}.mp4`,
            caption: faizanStyle('VIDEO DOC', finalTitle.substring(0, 100), '✅', result.quality, '—', '—')
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
        console.error('Video Doc Error:', err);
        reply(faizanStyle('VIDEO DOC', err.message || 'Download failed', '❌', '—', '—', '—'));
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});
