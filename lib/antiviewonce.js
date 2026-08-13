const { getContentType, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { getAntiViewOnceStatus, GLOBAL_KEY } = require('../data/AntiViewOnce');

/**
 * Auto-forward incoming view-once media to the bot owner's own inbox.
 * Controlled by the `antiviewonce` toggle (see plugins/antiviewonce.js).
 *
 * Detection must NOT rely on Baileys' getContentType() for the wrapper: that helper
 * only recognises keys ending in Message / V2 / V3, so `viewOnceMessageV2Extension`
 * — the wrapper WhatsApp uses for view-once VOICE NOTES — came back as undefined and
 * every view-once voice note was ignored. Wrappers are therefore matched by key, and
 * unwrapped repeatedly, because they nest in both orders (ephemeral inside view-once
 * and view-once inside ephemeral) and can hide media behind
 * documentWithCaptionMessage.
 */

const VIEW_ONCE_WRAPPERS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
const TRANSPARENT_WRAPPERS = ['ephemeralMessage', 'documentWithCaptionMessage'];

const MEDIA_TYPES = {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'document'
};

const log = (msg, err) => console.log(`[antiviewonce] ${msg}${err ? ` — ${err}` : ''}`);

const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
};

// Which key actually carries content in this node. Checked by key so unknown-to-
// getContentType wrappers (viewOnceMessageV2Extension) are still seen.
const contentKey = (node) => {
    if (!node || typeof node !== 'object') return null;
    const keys = Object.keys(node);
    return keys.find(k => VIEW_ONCE_WRAPPERS.includes(k))
        || keys.find(k => TRANSPARENT_WRAPPERS.includes(k))
        || keys.find(k => MEDIA_TYPES[k])
        || getContentType(node)
        || null;
};

/**
 * Returns { mtype, msg } for the inner media of a view-once message, else null.
 * Walks nested wrappers in any order.
 */
const extractViewOnce = (message) => {
    let node = message;
    let sawViewOnce = false;

    for (let depth = 0; node && depth < 6; depth++) {
        const key = contentKey(node);
        if (!key) return null;

        if (VIEW_ONCE_WRAPPERS.includes(key)) {
            sawViewOnce = true;
            node = node[key]?.message;
            continue;
        }
        if (TRANSPARENT_WRAPPERS.includes(key)) {
            node = node[key]?.message;
            continue;
        }
        if (MEDIA_TYPES[key]) {
            // Either it sat inside a view-once wrapper, or the client sent the media
            // node directly with viewOnce: true.
            if (sawViewOnce || node[key]?.viewOnce === true) return { mtype: key, msg: node[key] };
            return null;
        }
        return null;
    }
    return null;
};

// Group subject without hammering WhatsApp: main.js installs cachedGroupMetadata on
// the socket, and querying groupMetadata per view-once is what earns `rate-overlimit`.
const groupSubject = async (conn, chatId) => {
    try {
        const cached = conn.cachedGroupMetadata ? await conn.cachedGroupMetadata(chatId) : null;
        if (cached?.subject) return cached.subject;
        const meta = await conn.groupMetadata(chatId);
        return meta?.subject || '';
    } catch (e) {
        log(`group name lookup failed for ${chatId}`, e.message);
        return '';
    }
};

// Expired or re-uploaded media fails to decrypt on the first try; Baileys' documented
// recovery is updateMediaMessage(), so retry once through it instead of giving up.
const downloadMedia = async (conn, mek, found) => {
    const type = MEDIA_TYPES[found.mtype];
    try {
        return await streamToBuffer(await downloadContentFromMessage(found.msg, type));
    } catch (e) {
        log(`download failed (${e.message}), asking WhatsApp to re-upload`);
        if (typeof conn.updateMediaMessage !== 'function') throw e;
        const refreshed = await conn.updateMediaMessage({ ...mek });
        const again = extractViewOnce(refreshed?.message || mek.message);
        if (!again) throw e;
        return await streamToBuffer(await downloadContentFromMessage(again.msg, type));
    }
};

const handleAntiViewOnce = async (conn, mek) => {
    try {
        if (!mek || !mek.message) return;

        const found = extractViewOnce(mek.message);
        if (!found) return;

        const chatId = mek.key.remoteJid;

        // Own outgoing view-once cannot be forwarded (and Baileys is configured not to
        // emit own events) — log it so a test from the bot's own phone is not mistaken
        // for a broken feature.
        if (mek.key?.fromMe) {
            log('view-once seen but it was sent BY this number — ask someone else to send one to test');
            return;
        }

        // Global switch first, then a per-chat override.
        const enabled = (await getAntiViewOnceStatus(GLOBAL_KEY)) || (await getAntiViewOnceStatus(chatId));
        if (!enabled) {
            log(`view-once ${found.mtype} ignored — toggle is OFF (use .antiviewonce on)`);
            return;
        }

        const sender = mek.key.participant || mek.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const groupName = isGroup ? await groupSubject(conn, chatId) : '';
        const caption = found.msg.caption || '';
        const inboxJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

        log(`view-once ${found.mtype} from ${sender} in ${isGroup ? (groupName || chatId) : 'private'} — forwarding`);

        let buffer = null;
        let downloadError = null;
        try {
            buffer = await downloadMedia(conn, mek, found);
        } catch (e) {
            downloadError = e.message;
        }
        if (buffer && !buffer.length) {
            buffer = null;
            downloadError = 'media returned 0 bytes (already expired)';
        }

        const info = `👁️ *ANTI VIEW-ONCE*\n\n` +
            `👤 *From:* @${sender.split('@')[0]}\n` +
            (isGroup ? `👥 *Group:* ${groupName || chatId}\n` : `💬 *Chat:* Private\n`) +
            `📎 *Type:* ${found.mtype.replace('Message', '')}\n` +
            `🕒 *Time:* ${new Date().toLocaleString()}` +
            (caption ? `\n\n📝 *Caption:* ${caption}` : '') +
            (downloadError ? `\n\n⚠️ *Media download failed:* ${downloadError}` : '');

        // The notice goes out even when the media could not be pulled, so a failure is
        // visible instead of looking like the feature never ran.
        await conn.sendMessage(inboxJid, { text: info, mentions: [sender] });

        if (!buffer) {
            log('forward incomplete — notice sent without media', downloadError);
            return;
        }

        const payload =
            found.mtype === 'imageMessage'    ? { image: buffer, caption } :
            found.mtype === 'videoMessage'    ? { video: buffer, caption, mimetype: found.msg.mimetype || 'video/mp4' } :
            found.mtype === 'audioMessage'    ? { audio: buffer, mimetype: found.msg.mimetype || 'audio/mp4', ptt: found.msg.ptt || false } :
            found.mtype === 'stickerMessage'  ? { sticker: buffer } :
            { document: buffer, mimetype: found.msg.mimetype || 'application/octet-stream', fileName: found.msg.fileName || 'file' };

        await conn.sendMessage(inboxJid, payload);
        log(`forwarded ${found.mtype} (${buffer.length} bytes) to inbox`);
    } catch (e) {
        console.error('[antiviewonce] handler error:', e.message);
    }
};

module.exports = { handleAntiViewOnce, extractViewOnce };
