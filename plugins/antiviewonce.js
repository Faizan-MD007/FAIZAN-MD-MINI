const { cmd } = require('../arslan');
const { getAntiViewOnceStatus, setAntiViewOnceStatus, GLOBAL_KEY } = require('../data/AntiViewOnce');
const { sendToggleButtons } = require('../lib/toggle-buttons');

cmd({
    pattern: 'antiviewonce',
    alias: ['antionceview', 'antivv', 'avo', 'antiviewonce2'],
    react: '👁️',
    desc: 'Auto-send every incoming view-once media to the owner inbox (on/off)',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { from, args, isCreator, reply, prefix }) => {
    try {
        if (!isCreator) return reply('*📛 Ye command sirf bot owner ke liye hai.*');

        const choice = (args[0] || '').toLowerCase();
        const scopeArg = (args[1] || '').toLowerCase();
        // default scope = global (every chat); `chat` limits it to this chat only
        const scope = scopeArg === 'chat' || scopeArg === 'here' ? from : GLOBAL_KEY;
        const scopeLabel = scope === GLOBAL_KEY ? 'all chats' : 'this chat';

        if (choice !== 'on' && choice !== 'off') {
            const globalOn = await getAntiViewOnceStatus(GLOBAL_KEY);
            // Bare ".antiviewonce" — tap-to-toggle buttons (global scope) instead of
            // making the owner remember the on/off/chat syntax.
            return sendToggleButtons(conn, mek, {
                from, prefix, command: 'antiviewonce', label: 'ANTI VIEW-ONCE',
                current: globalOn, reply
            });
        }

        await setAntiViewOnceStatus(scope, choice === 'on');

        return reply(
            choice === 'on'
                ? `✅ *Anti view-once ON* (${scopeLabel}).\nAb koi bhi view-once media automatic aap ke inbox me aayega.`
                : `❌ *Anti view-once OFF* (${scopeLabel}).`
        );
    } catch (e) {
        console.error('[antiviewonce cmd]', e);
        return reply('❌ Setting save nahi ho saki: ' + e.message);
    }
});
