const { cmd } = require('../arslan');
const { getAntiViewOnceStatus, setAntiViewOnceStatus, GLOBAL_KEY } = require('../data/AntiViewOnce');

cmd({
    pattern: 'antiviewonce',
    alias: ['antionceview', 'antivv', 'avo', 'antiviewonce2'],
    react: '👁️',
    desc: 'Auto-send every incoming view-once media to the owner inbox (on/off)',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply('*📛 Ye command sirf bot owner ke liye hai.*');

        const choice = (args[0] || '').toLowerCase();
        const scopeArg = (args[1] || '').toLowerCase();
        // default scope = global (every chat); `chat` limits it to this chat only
        const scope = scopeArg === 'chat' || scopeArg === 'here' ? from : GLOBAL_KEY;
        const scopeLabel = scope === GLOBAL_KEY ? 'all chats' : 'this chat';

        if (choice !== 'on' && choice !== 'off') {
            const globalOn = await getAntiViewOnceStatus(GLOBAL_KEY);
            const chatOn = await getAntiViewOnceStatus(from);
            return reply(
                `👁️ *ANTI VIEW-ONCE*\n\n` +
                `• All chats: *${globalOn ? 'ON' : 'OFF'}*\n` +
                `• This chat: *${chatOn ? 'ON' : 'OFF'}*\n\n` +
                `*Usage:*\n` +
                `.antiviewonce on\n` +
                `.antiviewonce off\n` +
                `.antiviewonce on chat  (only this chat)\n\n` +
                `ON hone ke baad jo bhi view-once photo/video/voice aayegi, wo automatic aap ke inbox me aa jayegi.`
            );
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
