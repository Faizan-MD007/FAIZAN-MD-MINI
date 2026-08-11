/**
 * Interactive buttons helper (FAIZAN-MD).
 *
 * Plain @whiskeysockets/baileys cannot emit the binary nodes WhatsApp needs for
 * interactive buttons, so the raw `relayMessage(interactiveMessage)` blocks used
 * in song.js / fb.js were accepted locally and rendered as nothing on the phone.
 * `gifted-btns` injects those nodes (biz / interactive / native_flow / bot).
 *
 * This wrapper keeps every plugin on one call and never leaves the user with
 * silence: if the button send fails for any reason (old baileys, WhatsApp
 * rejecting the node, package missing), it falls back to a plain text menu that
 * lists the same commands so the feature still works by typing.
 */

let sendButtons = null;
let loadError = null;

try {
    ({ sendButtons } = require('gifted-btns'));
} catch (e) {
    loadError = e;
    console.error('[buttons] gifted-btns not installed — run `npm install gifted-btns`:', e.message);
}

/**
 * @param {object} conn      baileys socket
 * @param {string} jid       target chat
 * @param {object} opts      { title, text, footer, image, aimode, buttons }
 *                           buttons: [{ display_text, id }]  (id = command text to run)
 * @param {object} [quoted]  message to quote in the fallback
 */
const sendBtns = async (conn, jid, opts, quoted) => {
    const { title, text, footer, image, aimode = false, buttons = [] } = opts;

    if (!buttons.length) throw new Error('sendBtns called with no buttons');

    if (sendButtons) {
        try {
            return await sendButtons(conn, jid, {
                title,
                text,
                footer,
                ...(image ? { image } : {}),
                aimode,
                buttons: buttons.map(b => ({
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: b.display_text,
                        id: b.id
                    })
                }))
            });
        } catch (e) {
            // Loud, then degrade — a silent failure here looks like a dead command.
            console.error('[buttons] send failed, falling back to text menu:', e.message);
        }
    }

    const menu = buttons.map((b, i) => `*${i + 1}.* ${b.display_text}\n   \`${b.id}\``).join('\n');
    const body = `${title ? `*${title}*\n\n` : ''}${text || ''}\n\n${menu}\n\n` +
        `_Buttons load nahi huay — upar wala command copy karke bhej dein._` +
        `${footer ? `\n\n${footer}` : ''}`;

    return conn.sendMessage(jid, { text: body }, quoted ? { quoted } : {});
};

module.exports = { sendBtns, buttonsAvailable: () => !!sendButtons, buttonsLoadError: () => loadError };
