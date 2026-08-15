const { cmd, commands } = require('../arslan');
const config = require('../config');
const { faizan } = require('../lib/style');
const { sendToggleButtons } = require('../lib/toggle-buttons');
const { getAntiLinkStatus } = require('../data/AntiLink');
const { getAntiViewOnceStatus, GLOBAL_KEY: AVO_GLOBAL } = require('../data/AntiViewOnce');

/**
 * `.env` — single control panel for every on/off setting spread across
 * config.js / all-settings.js / antidel.js / anti-link.js / antiviewonce.js.
 *
 * `.env`            -> status of every toggle in one message
 * `.env <name>`      -> ON/OFF buttons for just that one toggle (tapping
 *                       re-sends "<prefix><command> on/off", same as typing
 *                       the toggle's own bare command — see lib/toggle-buttons.js)
 *
 * A single message with 2 buttons per toggle (20+ buttons for ~11 toggles)
 * would be unusable on the phone, so `.env` lists status as text and lets the
 * user open buttons for exactly the one they want to flip.
 */

// name -> { command, label, isGroupScoped, getCurrent(ctx) }
// `command` must match a real pattern in another plugin so the ON/OFF button
// tap (which just re-sends "<prefix><command> on/off") dispatches correctly.
const TOGGLES = [
    { name: 'antilink', command: 'antilink', label: 'ANTILINK', groupScoped: true,
        getCurrent: async ({ from }) => await getAntiLinkStatus(from) },
    { name: 'antidel', command: 'antidel', label: 'ANTI-DELETE',
        getCurrent: async () => config.ANTI_DELETE === 'true' },
    { name: 'antiviewonce', command: 'antiviewonce', label: 'ANTI VIEW-ONCE',
        getCurrent: async () => await getAntiViewOnceStatus(AVO_GLOBAL) },
    { name: 'autoreact', command: 'autoreact', label: 'AUTO REACT',
        getCurrent: async ({ userConfigLive }) => userConfigLive.AUTO_REACT === 'true' },
    { name: 'autoviewsview', command: 'autoviewsview', label: 'AUTO STATUS VIEW',
        getCurrent: async ({ userConfigLive }) => userConfigLive.AUTO_VIEW_STATUS === 'true' },
    { name: 'autolikestatus', command: 'autolikestatus', label: 'AUTO LIKE STATUS',
        getCurrent: async ({ userConfigLive }) => userConfigLive.AUTO_LIKE_STATUS === 'true' },
    { name: 'autoread', command: 'autoread', label: 'AUTO READ',
        getCurrent: async ({ userConfigLive }) => userConfigLive.READ_MESSAGE === 'true' },
    { name: 'autotyping', command: 'autotyping', label: 'AUTO TYPING',
        getCurrent: async ({ userConfigLive }) => userConfigLive.AUTO_TYPING === 'true' },
    { name: 'autorecording', command: 'autorecording', label: 'AUTO RECORDING',
        getCurrent: async ({ userConfigLive }) => userConfigLive.AUTO_RECORDING === 'true' },
    { name: 'anticall', command: 'anticall', label: 'ANTI CALL',
        getCurrent: async ({ userConfigLive }) => userConfigLive.ANTI_CALL === 'true' },
    { name: 'welcome', command: 'welcome', label: 'WELCOME MESSAGE',
        getCurrent: async ({ userConfigLive }) => userConfigLive.WELCOME === 'true' },
    { name: 'goodbye', command: 'goodbye', label: 'GOODBYE MESSAGE',
        getCurrent: async ({ userConfigLive }) => userConfigLive.GOODBYE === 'true' },
];

const findToggle = (name) => TOGGLES.find(t => t.name === name || t.command === name);

cmd({
    pattern: 'env',
    alias: ['settings', 'toggles', 'controlpanel'],
    desc: 'Central control panel for every on/off setting (antilink, antidelete, antiviewonce, auto react, ...)',
    category: 'settings',
    react: '⚙️',
    use: '.env  |  .env <name>  e.g. .env antilink',
    filename: __filename
}, async (conn, mek, m, { from, args, isOwner, isCreator, reply, prefix, config: userConfigLive }) => {
    try {
        if (!isOwner && !isCreator) return reply(faizan('ENV', 'Owner only', '❌'));

        const wanted = (args[0] || '').toLowerCase();

        if (wanted) {
            const toggle = findToggle(wanted);
            if (!toggle) {
                return reply(faizan('ENV', `Unknown setting "${wanted}"\nSend *.env* to see the full list.`, '❓'));
            }
            const current = await toggle.getCurrent({ from, userConfigLive });
            return sendToggleButtons(conn, mek, { from, prefix, command: toggle.command, label: toggle.label, current, reply });
        }

        // No argument — status overview of every toggle.
        const lines = [];
        for (const toggle of TOGGLES) {
            let current;
            try {
                current = await toggle.getCurrent({ from, userConfigLive });
            } catch (e) {
                current = false;
            }
            lines.push(`*│❀ ${current ? '🟢' : '🔴'} ${toggle.label}:* ${current ? 'ON' : 'OFF'}  \`.env ${toggle.name}\``);
        }

        const body =
`*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} — 𝐄𝐍𝐕 ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
${lines.join('\n')}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

📝 *Tap-to-toggle:* send \`.env <name>\` (e.g. \`${prefix}env antilink\`) for ON/OFF buttons.
_Antilink status shown above is for THIS chat._

> ${config.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ꜰᴀɪᴢᴀɴ-ᴍᴅ'}`;

        return reply(body);
    } catch (e) {
        console.error('[env]', e);
        return reply(faizan('ENV', e.message || 'Error occurred', '❌'));
    }
});
