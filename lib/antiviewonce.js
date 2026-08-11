const { getContentType, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getAntiViewOnceStatus, GLOBAL_KEY } = require('../data/AntiViewOnce');

const VIEW_ONCE_WRAPPERS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];

const MEDIA_TYPES = {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'document'
};

const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
};

// Returns the inner media node of a view-once message, or null when the
// message isn't view-once at all.
const extractViewOnce = (message) => {
    if (!message) return null;
    let node = message;
    // ephemeral wrapper can sit outside the view-once wrapper
    if (getContentType(node) === 'ephemeralMessage') node = node.ephemeralMessage.message;
    const type = getContentType(node);
    if (!VIEW_ONCE_WRAPPERS.includes(type)) {
        // Some clients send the media node directly with viewOnce: true
        const inner = getContentType(node);
        if (MEDIA_TYPES[inner] && node[inner]?.viewOnce === true) {
            return { mtype: inner, msg: node[inner] };
        }
        return null;
    }
    const inner = node[type].message;
    const mtype = getContentType(inner);
    if (!MEDIA_TYPES[mtype]) return null;
    return { mtype, msg: inner[mtype] };
};

/**
 * Auto-forward any incoming view-once media to the bot owner's own inbox.
 * Controlled by the `antiviewonce` toggle (see plugins/antiviewonce.js).
 */
const handleAntiViewOnce = async (conn, mek) => {
    try {
        if (!mek || !mek.message) return;
        if (mek.key?.fromMe) return;

        const found = extractViewOnce(mek.message);
        if (!found) return;

        const chatId = mek.key.remoteJid;
        // Global switch first, then a per-chat override.
        const enabled = (await getAntiViewOnceStatus(GLOBAL_KEY)) || (await getAntiViewOnceStatus(chatId));
        if (!enabled) return;

        const stream = await downloadContentFromMessage(found.msg, MEDIA_TYPES[found.mtype]);
        const buffer = await streamToBuffer(stream);
        if (!buffer || !buffer.length) {
            console.error('[antiviewonce] empty buffer — media may have expired');
            return;
        }

        const sender = mek.key.participant || mek.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        let groupName = '';
        if (isGroup) {
            try { groupName = (await conn.groupMetadata(chatId)).subject; } catch (e) {}
        }

        const caption = found.msg.caption || '';
        const info = `👁️ *ANTI VIEW-ONCE*\n\n` +
            `👤 *From:* @${sender.split('@')[0]}\n` +
            (isGroup ? `👥 *Group:* ${groupName || chatId}\n` : `💬 *Chat:* Private\n`) +
            `📎 *Type:* ${found.mtype.replace('Message', '')}\n` +
            `🕒 *Time:* ${new Date().toLocaleString()}` +
            (caption ? `\n\n📝 *Caption:* ${caption}` : '');

        const inboxJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

        await conn.sendMessage(inboxJid, { text: info, mentions: [sender] });

        const payload =
            found.mtype === 'imageMessage'    ? { image: buffer, caption } :
            found.mtype === 'videoMessage'    ? { video: buffer, caption, mimetype: found.msg.mimetype || 'video/mp4' } :
            found.mtype === 'audioMessage'    ? { audio: buffer, mimetype: found.msg.mimetype || 'audio/mp4', ptt: found.msg.ptt || false } :
            found.mtype === 'stickerMessage'  ? { sticker: buffer } :
            { document: buffer, mimetype: found.msg.mimetype || 'application/octet-stream', fileName: found.msg.fileName || 'file' };

        await conn.sendMessage(inboxJid, payload);
    } catch (e) {
        console.error('[antiviewonce] handler error:', e.message);
    }
};

module.exports = { handleAntiViewOnce, extractViewOnce };
