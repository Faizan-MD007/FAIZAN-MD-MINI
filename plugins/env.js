const { cmd } = require('../arslan');
const config = require('../config');
const { faizan } = require('../lib/style');
const { sendToggleButtons } = require('../lib/toggle-buttons');
const { updateUserConfig } = require('../lib/database');
const { getAntiLinkStatus, setAntiLinkStatus } = require('../data/AntiLink');
const { getAntiViewOnceStatus, setAntiViewOnceStatus, GLOBAL_KEY: AVO_GLOBAL } = require('../data/AntiViewOnce');

/**
 * Central settings panel.
 *
 * `.env`                  -> text overview of every boolean setting
 * `.env <name>`           -> two FAIZAN-style ON/OFF buttons
 * `.env <name> on|off`    -> persist the selected value
 *
 * Button IDs deliberately re-dispatch `.env <name> on/off`, so settings that
 * do not have a separate command still work from the same control panel.
 */

const TOGGLES = [
    { name: 'antilink', label: 'ANTILINK', command: 'env antilink', special: 'antilink', get: ({ from }) => getAntiLinkStatus(from) },
    { name: 'antidelete', aliases: ['antidel'], label: 'ANTI-DELETE', command: 'env antidelete', key: 'ANTI_DELETE' },
    { name: 'antiviewonce', aliases: ['antionceview', 'antivv', 'avo'], label: 'ANTI VIEW-ONCE', command: 'env antiviewonce', special: 'antiviewonce', get: () => getAntiViewOnceStatus(AVO_GLOBAL) },
    { name: 'autoreact', label: 'AUTO REACT', command: 'env autoreact', key: 'AUTO_REACT' },
    { name: 'autoviewstatus', aliases: ['autoviewsview', 'avs', 'statusseen', 'astatus'], label: 'AUTO STATUS VIEW', command: 'env autoviewstatus', key: 'AUTO_VIEW_STATUS' },
    { name: 'autolikestatus', aliases: ['als'], label: 'AUTO LIKE STATUS', command: 'env autolikestatus', key: 'AUTO_LIKE_STATUS' },
    { name: 'autostatusreply', label: 'AUTO STATUS REPLY', command: 'env autostatusreply', key: 'AUTO_STATUS_REPLY' },
    { name: 'autoread', label: 'AUTO READ', command: 'env autoread', key: 'READ_MESSAGE' },
    { name: 'autotyping', aliases: ['autotype', 'atyping'], label: 'AUTO TYPING', command: 'env autotyping', key: 'AUTO_TYPING' },
    { name: 'autorecording', aliases: ['autorec', 'arecording'], label: 'AUTO RECORDING', command: 'env autorecording', key: 'AUTO_RECORDING' },
    { name: 'anticall', aliases: ['acall'], label: 'ANTI CALL', command: 'env anticall', key: 'ANTI_CALL' },
    { name: 'antibad', aliases: ['antibadword', 'antib'], label: 'ANTI BAD WORD', command: 'env antibad', key: 'ANTI_BAD' },
    { name: 'antiedit', label: 'ANTI EDIT', command: 'env antiedit', key: 'ANTI_EDIT' },
    { name: 'welcome', label: 'WELCOME MESSAGE', command: 'env welcome', key: 'WELCOME', fallbackKey: 'WELCOME_ENABLE' },
    { name: 'goodbye', label: 'GOODBYE MESSAGE', command: 'env goodbye', key: 'GOODBYE', fallbackKey: 'GOODBYE_ENABLE' }
];

const findToggle = (name) => {
    const normalized = String(name || '').toLowerCase();
    return TOGGLES.find(toggle => toggle.name === normalized || (toggle.aliases || []).includes(normalized));
};

const asBoolean = (value) => value === true || String(value).toLowerCase() === 'true';

async function readToggle(toggle, ctx) {
    if (toggle.get) return asBoolean(await toggle.get(ctx));
    return asBoolean(ctx.userConfigLive?.[toggle.key] ?? ctx.userConfigLive?.[toggle.fallbackKey] ?? config[toggle.key] ?? config[toggle.fallbackKey]);
}

async function writeToggle(toggle, value, ctx) {
    if (toggle.special === 'antilink') {
        await setAntiLinkStatus(ctx.from, value);
        return;
    }
    if (toggle.special === 'antiviewonce') {
        await setAntiViewOnceStatus(AVO_GLOBAL, value);
        return;
    }
    const updated = { ...(ctx.userConfigLive || {}), [toggle.key]: value ? 'true' : 'false' };
    if (toggle.fallbackKey) updated[toggle.fallbackKey] = value ? 'true' : 'false';
    await updateUserConfig(ctx.botNumber, updated);
    if (ctx.userConfigLive) {
        ctx.userConfigLive[toggle.key] = value ? 'true' : 'false';
        if (toggle.fallbackKey) ctx.userConfigLive[toggle.fallbackKey] = value ? 'true' : 'false';
    }
}

cmd({
    pattern: 'env',
    alias: ['settings', 'toggles', 'controlpanel'],
    desc: 'Central ON/OFF control panel for bot settings',
    category: 'settings',
    react: '⚙️',
    use: '.env | .env <name> | .env <name> on/off',
    filename: __filename
}, async (conn, mek, m, { from, args, isOwner, isCreator, reply, prefix, botNumber, config: userConfigLive }) => {
    try {
        if (!isOwner && !isCreator) return reply(faizan('ENV', 'Owner only', '❌'));

        const name = String(args[0] || '').toLowerCase();
        const toggle = findToggle(name);
        if (name && !toggle) {
            return reply(faizan('ENV', `Unknown setting: ${name}\nUse *.env* to list settings.`, '❓'));
        }

        if (toggle && args[1]) {
            const requested = String(args[1]).toLowerCase();
            if (!['on', 'off', 'true', 'false'].includes(requested)) {
                return reply(faizan(toggle.label, 'Use: .env ' + toggle.name + ' on/off', '❓'));
            }
            const enabled = requested === 'on' || requested === 'true';
            await writeToggle(toggle, enabled, { from, botNumber, userConfigLive });
            return reply(faizan(toggle.label, enabled ? 'Enabled ✅' : 'Disabled ❌', enabled ? '🟢 ON' : '🔴 OFF'));
        }

        if (toggle) {
            const current = await readToggle(toggle, { from, userConfigLive });
            return sendToggleButtons(conn, mek, {
                from,
                prefix,
                command: toggle.command,
                label: toggle.label,
                current,
                reply
            });
        }

        const lines = [];
        for (const item of TOGGLES) {
            let current = false;
            try { current = await readToggle(item, { from, userConfigLive }); } catch (e) {}
            lines.push(`*│❀ ${current ? '🟢' : '🔴'} ${item.label}:* ${current ? 'ON' : 'OFF'}  \`${prefix}env ${item.name}\``);
        }

        return reply(`*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ ${config.BOT_NAME || '𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃'} — 𝐄𝐍𝐕 ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
${lines.join('\n')}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

📝 Send \`${prefix}env <name>\` for ON/OFF buttons.
> ${config.BOT_FOOTER || '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ꜰᴀɪᴢᴀɴ-ᴍᴅ'}`);
    } catch (e) {
        console.error('[env]', e);
        return reply(faizan('ENV', e.message || 'Error occurred', '❌'));
    }
});
