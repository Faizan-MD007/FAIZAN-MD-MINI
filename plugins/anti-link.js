const { cmd } = require('../arslan');
const { faizan } = require('../lib/style');
const { sendToggleButtons } = require('../lib/toggle-buttons');
const { getAntiLinkStatus, setAntiLinkStatus, getWarnings, setWarnings, clearWarningsForGroup } = require('../data/AntiLink');

// ════════════════════════════════════════════════════════════
// 📁 ANTILINK — persisted per group (Mongo + local JSON fallback, see
// data/AntiLink.js). Previously this lived only in an in-memory Map, so
// every bot restart silently turned antilink back OFF in every group with
// no warning; a group admin who enabled it days ago would have no idea it
// had stopped working.
// ════════════════════════════════════════════════════════════

// Link detection patterns — social media + generic URLs
const linkPatterns = [
    /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi,
    /https?:\/\/(www\.)?whatsapp\.com\/channel\/\S+/gi,
    /wa\.me\/\S+/gi,
    /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,
    /https?:\/\/(?:www\.)?youtube\.com\/\S+/gi,
    /https?:\/\/youtu\.be\/\S+/gi,
    /https?:\/\/(?:www\.)?facebook\.com\/\S+/gi,
    /https?:\/\/fb\.me\/\S+/gi,
    /https?:\/\/(?:www\.)?instagram\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?twitter\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?x\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?tiktok\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?linkedin\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?snapchat\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?pinterest\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?reddit\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?discord\.gg\/\S+/gi,
    /https?:\/\/(?:www\.)?discord\.com\/\S+/gi,
    /https?:\/\/(?:www\.)?twitch\.tv\/\S+/gi,
    /https?:\/\/bit\.ly\/\S+/gi,
    /https?:\/\/tinyurl\.com\/\S+/gi,
    /https?:\/\/t\.co\/\S+/gi,
    /https?:\/\/\S+\.\S{2,6}(\/\S*)?/gi,   // catch-all generic URL
];

// =========== ANTILINK ON/OFF COMMAND ===========
cmd({
    pattern: "antilink",
    alias: ["al"],
    desc: "Enable/disable antilink (warn + delete first, remove on second offense)",
    category: "group",
    react: "🔗",
    use: ".antilink on/off",
    filename: __filename
},
async (conn, mek, m, { from, args, isGroup, isOwner, isAdmins, isBotAdmins, reply, prefix }) => {
    try {
        if (!isGroup) return reply(faizan('ANTILINK', 'Groups only', '❌'));
        if (!isOwner && !isAdmins) return reply(faizan('ANTILINK', 'Admin/Owner only', '❌'));
        if (!isBotAdmins) return reply(faizan('ANTILINK', 'Bot must be admin', '❌'));

        const action = (args[0] || '').toLowerCase();

        if (!action) {
            // Bare ".antilink" — show the current state as tap-to-toggle buttons
            // instead of forcing the admin to remember the on/off syntax.
            const current = await getAntiLinkStatus(from);
            return sendToggleButtons(conn, mek, { from, prefix, command: 'antilink', label: 'ANTILINK', current, reply });
        }
        if (!['on', 'off'].includes(action)) {
            return reply(faizan('ANTILINK', 'Use: .antilink on/off', '❓'));
        }

        if (action === 'on') {
            await setAntiLinkStatus(from, true);
            reply(faizan('ANTILINK', 'Enabled ✅', '🟢'));
        } else {
            await setAntiLinkStatus(from, false);
            clearWarningsForGroup(from);
            reply(faizan('ANTILINK', 'Disabled ❌', '🔴'));
        }

    } catch (e) {
        console.error('Antilink cmd error:', e);
        reply(faizan('ANTILINK', e.message || 'Error occurred', '❌'));
    }
});

// =========== ANTILINK DETECTOR (on every message body) ===========
// 1st offense: warn + delete link
// 2nd offense: remove from group
cmd({
    on: "body"
},
async (conn, mek, m, { from, body, sender, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup || isAdmins || !isBotAdmins) return;
        if (mek.key?.fromMe) return; // Never process bot's own messages for antilink

        // Check if antilink is enabled for this group (persisted — survives restarts)
        if (!(await getAntiLinkStatus(from))) return;

        // Reset regex lastIndex before testing (important for /g flags)
        const hasLink = linkPatterns.some(p => {
            p.lastIndex = 0;
            return p.test(body || '');
        });
        if (!hasLink) return;

        const warnKey = `${from}:${sender}`;
        const userWarnings = getWarnings(warnKey);

        if (userWarnings === 0) {
            // ⚠️ FIRST OFFENSE: Warn + Delete message
            setWarnings(warnKey, 1);

            try { await conn.sendMessage(from, { delete: mek.key }); } catch (e) {
                console.error(`[antilink] delete failed in ${from}: ${e.message}`);
            }

            await conn.sendMessage(from, {
                text: `⚠️ *WARNING!* @${sender.split('@')[0]}\n\n🔗 Links are not allowed in this group!\n🗑️ Your message has been deleted.\n\n❗ _Next time you will be removed from the group._`,
                mentions: [sender]
            }, { quoted: mek });

        } else {
            // 🚫 SECOND OFFENSE: Delete + Remove from group
            setWarnings(warnKey, 0);

            try { await conn.sendMessage(from, { delete: mek.key }); } catch (e) {
                console.error(`[antilink] delete failed in ${from}: ${e.message}`);
            }

            await conn.sendMessage(from, {
                text: `🚫 *REMOVED!* @${sender.split('@')[0]}\n\n🔗 You were warned about sending links.\n👮 You have been removed from the group.`,
                mentions: [sender]
            }, { quoted: mek });

            try {
                await conn.groupParticipantsUpdate(from, [sender], "remove");
            } catch (e) {
                console.error(`[antilink] failed to remove ${sender} from ${from}: ${e.message}`);
            }
        }

    } catch (e) {
        console.error('Antilink detect error:', e);
    }
});
