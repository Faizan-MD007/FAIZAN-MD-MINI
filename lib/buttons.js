/**
 * Interactive buttons helper (FAIZAN-MD).
 *
 * Plain @whiskeysockets/baileys cannot emit the binary nodes WhatsApp needs for
 * interactive buttons, so the raw `relayMessage(interactiveMessage)` blocks used
 * in song.js / fb.js were accepted locally and rendered as nothing on the phone.
 * `gifted-btns` injects those nodes (biz / interactive / native_flow / bot).
 *
 * IMPORTANT — payload shape: gifted-btns' `sendButtons()` accepts ONLY the legacy
 * quick-reply shape `{ id, text }` (plus named cta_url / cta_copy / cta_call).
 * Passing WhatsApp's own `{ name: 'quick_reply', buttonParamsJson }` makes it throw
 * `InteractiveValidationError: button[0] name 'quick_reply' not allowed in
 * sendButtons`, which is why the first attempt silently fell back to a text menu.
 * Plugins keep using `{ display_text, id }`; the conversion happens here.
 *
 * If the button send still fails for any reason (package missing, WhatsApp rejecting
 * the node), a plain text menu listing the same commands goes out instead, so a
 * command never answers with silence.
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
 *                           buttons: [{ display_text, id }]        -> quick reply
 *                                    [{ display_text, url }]       -> cta_url
 *                                    [{ display_text, copy_code }] -> cta_copy
 * @param {object} [quoted]  message to quote in the fallback
 */
const sendBtns = async (conn, jid, opts, quoted) => {
    const { title, text, footer, image, aimode = false, buttons = [] } = opts;

    if (!buttons.length) throw new Error('sendBtns called with no buttons');

    if (sendButtons) {
        try {
            const payload = buttons.map(b => {
                const label = b.display_text || b.text;
                if (b.url) {
                    return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: label, url: b.url }) };
                }
                if (b.copy_code) {
                    return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: label, copy_code: b.copy_code }) };
                }
                // legacy quick reply — the only quick-reply shape sendButtons accepts
                return { id: b.id, text: label };
            });

            return await sendButtons(conn, jid, {
                ...(title ? { title } : {}),
                text,
                ...(footer ? { footer } : {}),
                ...(image ? { image } : {}),
                aimode,
                buttons: payload
            });
        } catch (e) {
            // Loud, then degrade — a silent failure here looks like a dead command.
            console.error('[buttons] send failed, falling back to text menu:', e.message,
                e.errors ? JSON.stringify(e.errors) : '');
        }
    }

    const menu = buttons.map((b, i) => `*${i + 1}.* ${b.display_text || b.text}\n   \`${b.id || b.url || ''}\``).join('\n');
    const body = `${title ? `*${title}*\n\n` : ''}${text || ''}\n\n${menu}\n\n` +
        `_Buttons load nahi huay — upar wala command copy karke bhej dein._` +
        `${footer ? `\n\n${footer}` : ''}`;

    return conn.sendMessage(jid, { text: body }, quoted ? { quoted } : {});
};

module.exports = { sendBtns, buttonsAvailable: () => !!sendButtons, buttonsLoadError: () => loadError };
