const config = require('../config')
const { cmd } = require('../arslan')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('../lib/functions')

cmd({
    pattern: "revoke",
    react: "🖇️",
    alias: ["revokegrouplink", "resetglink", "revokelink", "f_revoke"],
    desc: "To Reset the group link",
    category: "group",
    use: '.revoke',
    filename: __filename
},
async (conn, mek, m, {
    from, isCmd, isGroup, sender, isBotAdmins,
    isAdmins, reply
}) => {
    try {
        if (!isGroup) return reply(`❌ This command only works in groups.`);
        if (!isAdmins) return reply(`⛔ You must be a *Group Admin* to use this command.`);
        if (!isBotAdmins) return reply(`❌ I need to be *admin* to reset the group link.`);

        await conn.groupRevokeInvite(from);
        await conn.sendMessage(from, {
            text: `✅ *Group Link has been reset successfully!*`
        }, { quoted: mek });

    } catch (err) {
        console.error(err);
        reply(`❌ Error resetting group link.`);
    }
});
