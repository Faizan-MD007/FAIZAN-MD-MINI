const { cmd } = require('../arslan');
const { setAntideleteStatus, getAntideleteStatus } = require('../data/Antidelete');
const { faizan } = require('../lib/style');

cmd({
    pattern: "antidelete",
    alias: ["antidel"],
    desc: "Turn Antidelete on/off",
    category: "owner",
    react: "🛡️"
},
async(conn, mek, m, { args, isOwner, reply, from }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const mode = args[0]?.toLowerCase();

    if (mode === 'on' || mode === 'enable') {
        await setAntideleteStatus(from, true);
        await reply(faizan('ANTI-DELETE', 'Activated ✅', '🟢'));
    } else if (mode === 'off' || mode === 'disable') {
        await setAntideleteStatus(from, false);
        await reply(faizan('ANTI-DELETE', 'De-activated ❌', '🔴'));
    } else {
        const current = await getAntideleteStatus(from);
        await reply(faizan('ANTI-DELETE', current ? 'ON ✅' : 'OFF ❌', 'Use: .antidelete on/off'));
    }
});
