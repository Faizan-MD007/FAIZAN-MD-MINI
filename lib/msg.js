const {
    proto,
    getContentType,
    jidNormalizedUser,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');

// Media message types we know how to download / rebuild.
const MEDIA_TYPES = {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'document',
    documentWithCaptionMessage: 'document'
};

const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
};

// Unwrap the view-once / ephemeral / documentWithCaption wrappers so callers
// always see the real inner media node.
const unwrap = (message) => {
    let msg = message;
    for (let i = 0; i < 5 && msg; i++) {
        const t = getContentType(msg);
        if (t === 'viewOnceMessage' || t === 'viewOnceMessageV2' || t === 'viewOnceMessageV2Extension' ||
            t === 'ephemeralMessage' || t === 'documentWithCaptionMessage') {
            msg = msg[t].message;
            continue;
        }
        break;
    }
    return msg;
};

/**
 * Build a rich quoted object.
 *
 * FIX: the old version returned a bare `{ message, stanzaId, participant }`
 * object — it had no `mtype`, no `text` and no `download()`. Every plugin that
 * replies to media (vv, vv2, vv3, sticker/s, attp, toaudio, tourl, ...) calls
 * `m.quoted.download()` / reads `m.quoted.mtype`, so they all threw
 * "download is not a function" or silently bailed on an undefined mtype.
 */
const buildQuoted = (conn, m, contextInfo) => {
    if (!contextInfo || !contextInfo.quotedMessage) return null;

    const raw = contextInfo.quotedMessage;
    const message = unwrap(raw) || raw;
    const mtype = getContentType(message);
    const msg = message[mtype] || {};

    const quoted = {
        // raw + unwrapped shapes, both useful to plugins
        raw,
        message,
        mtype,
        msg,
        // view-once flag so plugins can tell why the media was hidden
        isViewOnce: ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']
            .includes(getContentType(raw)),
        stanzaId: contextInfo.stanzaId,
        id: contextInfo.stanzaId,
        participant: contextInfo.participant,
        sender: contextInfo.participant,
        chat: m.key.remoteJid,
        mimetype: msg.mimetype || '',
        fileName: msg.fileName || msg.title || '',
        ptt: msg.ptt || false,
        caption: msg.caption || '',
        text: msg.caption || msg.text || message.conversation ||
              message.extendedTextMessage?.text || '',
        mentionedJid: msg.contextInfo?.mentionedJid || [],
        isMedia: !!MEDIA_TYPES[mtype]
    };

    // A real WebMessageInfo for the quoted message, so `{ forward: quoted.fakeObj }`
    // and `{ quoted: quoted.fakeObj }` work (used by forward/antiviewonce flows).
    quoted.fakeObj = proto.WebMessageInfo.fromObject({
        key: {
            remoteJid: m.key.remoteJid,
            fromMe: false,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant
        },
        message
    });

    quoted.download = async () => {
        if (!MEDIA_TYPES[mtype]) throw new Error('Quoted message is not downloadable media: ' + mtype);
        const stream = await downloadContentFromMessage(msg, MEDIA_TYPES[mtype]);
        return await streamToBuffer(stream);
    };

    quoted.delete = () => conn.sendMessage(m.key.remoteJid, {
        delete: quoted.fakeObj.key
    });

    return quoted;
};

// Native_flow (gifted-btns) button replies carry the tapped id as JSON inside
// paramsJson, so plugins reading m.body saw nothing when a button was pressed.
const nativeFlowReplyId = (message) => {
    const params = message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (!params) return '';
    try {
        const parsed = JSON.parse(params);
        return parsed.id || parsed.selectedId || parsed.selectedRowId || parsed.display_text || '';
    } catch (e) {
        console.error('[msg] button reply paramsJson parse failed:', e.message);
        return '';
    }
};

const sms = (conn, m) => {
    if (!m) return m;

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = jidNormalizedUser(m.fromMe ? conn.user.id : (m.participant ? m.participant : m.key.participant ? m.key.participant : m.chat));
    }

    if (m.message) {
        m.mtype = getContentType(m.message);

        // ViewOnce / Ephemeral unwrapping (now also covers V2Extension and
        // documentWithCaption, which the old two-case check missed).
        const unwrapped = unwrap(m.message);
        if (unwrapped && unwrapped !== m.message) {
            m.isViewOnce = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'].includes(m.mtype);
            m.message = unwrapped;
            m.mtype = getContentType(m.message);
        }

        m.msg = m.message[m.mtype];

        // QUOTED MESSAGE (rich object — see buildQuoted)
        m.quoted = buildQuoted(conn, m, m.msg?.contextInfo);

        // FIX: exposed here so group plugins (add/kick/promote/demote/ban) can
        // read who was @mentioned — previously nothing populated mentionedJid.
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];

        // FIX: added `interactiveResponseMessage` (native_flow quick replies, i.e. the
        // gifted-btns button menus) and optional-chained every branch -- tapping a
        // button left m.body empty, and the old messageContextInfo branch threw on a
        // missing singleSelectReply.
        m.body = (m.mtype === 'conversation') ? m.message.conversation :
                 (m.mtype == 'imageMessage') ? m.message.imageMessage.caption :
                 (m.mtype == 'videoMessage') ? m.message.videoMessage.caption :
                 (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text :
                 (m.message.buttonsResponseMessage?.selectedButtonId
                  || m.message.templateButtonReplyMessage?.selectedId
                  || m.message.listResponseMessage?.singleSelectReply?.selectedRowId
                  || nativeFlowReplyId(m.message)
                  || '');

        m.reply = (text, chatId = m.chat, options = {}) => {
            return conn.sendMessage(chatId, { text: text }, { quoted: m, ...options });
        };
    }
    return m;
};

module.exports = { sms, unwrapMessage: unwrap };
