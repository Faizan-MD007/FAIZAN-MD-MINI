const { cmd } = require('../arslan');
const config = require('../config');
const { faizan } = require('../lib/style');


cmd({
    pattern: "anti-call",
    react: "👑",
    alias: ["anticall"],
    desc: "Enable or disable welcome messages for new members",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");

    const status = args[0]?.toLowerCase();
    if (status === "on") {
        config.ANTI_CALL = "true";
        return reply(faizan('ANTI-CALL', 'Activated ✅', '🟢'));
    } else if (status === "off") {
        config.ANTI_CALL = "false";
        return reply(faizan('ANTI-CALL', 'De-activated ❌', '🔴'));
    } else {
        return reply(faizan('ANTI-CALL', config.ANTI_CALL === 'true' ? 'ON ✅' : 'OFF ❌', 'Use: .anticall on/off'));
    }
});
