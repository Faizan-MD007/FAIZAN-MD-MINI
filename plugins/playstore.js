const axios = require("axios");
const { cmd } = require("../arslan");

cmd({
    pattern: "playstore",
    desc: "Search apps from PlayStore",
    category: "search",
    react: "📱",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {

        if (!q) {
            return reply("❌ *App name likho*\n\nExample:\n.playstore whatsapp");
        }

        // 🔎 API (same – no change)
        const api = `https://api.princetechn.com/api/search/playstore?apikey=prince&query=${q}`;
        const res = await axios.get(api);
        const data = res.data.results;

        if (!data || data.length === 0) {
            return reply("❌ *Koi app nahi mila*");
        }

        const app = data[0];

        // 🎨 FAIZAN-MD STYLE (ONLY STYLE CHANGED)
        const msg = `*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_ ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 📱 𝐀𝐩𝐩 𝐍𝐚𝐦𝐞:* ${app.name}
*│❀ 👨‍💻 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐞𝐫:* ${app.developer}
*│❀ ⭐ 𝐑𝐚𝐭𝐢𝐧𝐠:* ${app.rating}
*│❀ 📥 𝐈𝐧𝐬𝐭𝐚𝐥𝐥𝐬:* ${app.installs}
*│❀ 💰 𝐏𝐫𝐢𝐜𝐞:* ${app.price}
*│❀ 📝 𝐀𝐛𝐨𝐮𝐭:* ${app.summary}
*│❀ 🔗 𝐋𝐢𝐧𝐤:* ${app.link}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_`;

        await conn.sendMessage(from, {
            image: { url: app.img },
            caption: msg
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ PlayStore search error, please try again later");
    }
});
