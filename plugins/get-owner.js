const { cmd } = require('../arslan');
const config = require('../config');
const { sendBtns } = require('../lib/buttons');

cmd({
    pattern: "owner",
    react: "👑", 
    desc: "Get bot owner contact",
    category: "main",
    filename: __filename
}, 
async (conn, mek, m, { from }) => {
    try {
        const ownerNumber = config.OWNER_NUMBER;
        const ownerName = config.OWNER_NAME || "𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_";
        const waNumber = ownerNumber.replace(/[^0-9]/g, '');

        // vCard
        const vcard = 
`BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:FAIZAN-MD;
TEL;type=CELL;type=VOICE;waid=${waNumber}:${ownerNumber}
END:VCARD`;

        // Styled caption message
        const caption = `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³ ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│👑 𝐎𝐖𝐍𝐄𝐑 𝐂𝐎𝐍𝐓𝐀𝐂𝐓*
*│*
*│📛 𝐍𝐚𝐦𝐞:* ${ownerName}
*│📞 𝐍𝐮𝐦𝐛𝐞𝐫:* ${ownerNumber}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_
`;

        // 2 buttons as requested: DIRECT CHAT opens wa.me straight into a chat
        // with the owner; NUMBER copies the raw number to the clipboard.
        try {
            await sendBtns(conn, from, {
                title: '👑 𝐎ωɴєя',
                text: caption,
                buttons: [
                    { display_text: '💬 𝐃ιяєcт 𝐂нαт', url: `https://wa.me/${waNumber}` },
                    { display_text: '📋 𝐍υмвєя', copy_code: ownerNumber }
                ]
            }, mek);
        } catch (e) {
            // Fallback: no buttons available -> send styled text + contact card, as before.
            await conn.sendMessage(from, { text: caption }, { quoted: mek });
            await conn.sendMessage(from, {
                contacts: { displayName: ownerName, contacts: [{ vcard }] }
            }, { quoted: mek });
        }

    } catch (error) {
        console.error("OWNER CMD ERROR:", error);
        await conn.sendMessage(from, {
            text: "❌ Owner command error, please try again later."
        }, { quoted: mek });
    }
});
