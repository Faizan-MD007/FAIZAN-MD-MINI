const { cmd } = require('../arslan');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const { sendBtns } = require('../lib/buttons');
const config = require('../config');
const pipeline = promisify(stream.pipeline);

const pending = new Map();
const PENDING_TTL = 10 * 60 * 1000;

function remember(item) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    pending.set(id, { ...item, expires: Date.now() + PENDING_TTL });
    setTimeout(() => pending.delete(id), PENDING_TTL).unref?.();
    return id;
}

function getSource(item, kind) {
    if (kind === 'audio') return item.audioUrl || item.downloadUrl;
    return item.videoUrl || item.video_download || item.video_download_url || '';
}

async function sendSpotifyMedia(conn, from, mek, item, kind, variant) {
    const source = getSource(item, kind);
    if (!source) {
        return conn.sendMessage(from, {
            text: kind === 'video'
                ? '❌ This Spotify API returned no video source for this track.'
                : '❌ Audio source is unavailable.'
        }, { quoted: mek });
    }

    if (kind === 'audio') {
        return conn.sendMessage(from, {
            audio: { url: source },
            mimetype: 'audio/mpeg',
            ptt: variant === 'audio2',
            fileName: `${item.title || 'spotify'}.mp3`,
            caption: `*🎵 SPOTIFY AUDIO*\n\n${item.title || 'Track'}${item.artist ? ` — ${item.artist}` : ''}\n\n${config.BOT_FOOTER || ''}`
        }, { quoted: mek });
    }

    return conn.sendMessage(from, {
        video: { url: source },
        mimetype: 'video/mp4',
        caption: `*🎥 SPOTIFY VIDEO ${variant === 'video2' ? '2' : '1'}*\n\n${item.title || 'Track'}${item.artist ? ` — ${item.artist}` : ''}\n\n${config.BOT_FOOTER || ''}`
    }, { quoted: mek });
}

cmd({
    pattern: 'spotify',
    alias: ['splay', 'spot'],
    react: '🎵',
    desc: 'Direct Spotify Song Downloader',
    category: 'downloader',
    use: '.spotify <song name>',
    filename: __filename
}, async (conn, mek, m, { from, reply, q, prefix }) => {
    try {
        if (!q) return reply('❌ Please provide a song name.\nExample: .spotify pasoori');

        const searchUrl = `https://jerrycoder.oggyapi.workers.dev/spotify?search=${encodeURIComponent(q)}`;
        const searchRes = await axios.get(searchUrl, { timeout: 20000 });
        if (!searchRes.data?.tracks?.length) return reply('❌ No song found!');

        const bestSong = searchRes.data.tracks[0];
        const dlUrl = `https://jerrycoder.oggyapi.workers.dev/dspotify?url=${encodeURIComponent(bestSong.spotifyUrl)}`;
        const dlRes = await axios.get(dlUrl, { timeout: 20000 });
        const dlData = dlRes.data;
        if (!dlData?.status || !dlData.download_link) return reply('❌ Failed to fetch download link');

        const item = {
            title: dlData.title || bestSong.trackName,
            artist: dlData.artist || bestSong.artist,
            thumbnail: dlData.thumbnail || bestSong.thumbnail,
            audioUrl: dlData.download_link,
            videoUrl: dlData.video_link || dlData.video_url || dlData.video_download || ''
        };
        const key = remember(item);

        await sendBtns(conn, from, {
            title: '🎵 SPOTIFY DOWNLOADER',
            text: `*${item.title || 'Spotify Track'}*\n\n🎹 SELECT AUDIO OR VIDEO FORMAT\n\n${item.artist || ''}`,
            footer: config.BOT_FOOTER,
            ...(item.thumbnail ? { image: { url: item.thumbnail } } : {}),
            buttons: [
                { display_text: '🎵 AUDIO 1', id: `${prefix}spotifygrab ${key} audio1` },
                { display_text: '🎵 AUDIO 2', id: `${prefix}spotifygrab ${key} audio2` },
                { display_text: '🎥 VIDEO 1', id: `${prefix}spotifygrab ${key} video1` },
                { display_text: '🎥 VIDEO 2', id: `${prefix}spotifygrab ${key} video2` }
            ]
        }, mek);
    } catch (error) {
        console.error('Spotify Error:', error);
        reply('❌ Something went wrong. Please try again later.');
    }
});

cmd({
    pattern: 'spotifygrab',
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    const item = pending.get(args[0]);
    const variant = args[1] || 'audio1';
    if (!item || item.expires < Date.now()) return reply('❌ This Spotify selection expired. Please search again.');
    pending.delete(args[0]);
    return sendSpotifyMedia(conn, from, mek, item, variant.startsWith('video') ? 'video' : 'audio', variant);
});
