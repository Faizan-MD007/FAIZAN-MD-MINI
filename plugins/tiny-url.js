const { cmd } = require("../arslan");
const axios = require("axios");
const { sendBtns } = require('../lib/buttons');

cmd({
    pattern: "tiny",
    alias: ['short', 'shorturl'],
    react: "🫧",
    desc: "Makes URL tiny.",
    category: "convert",
    use: "<url>",
    filename: __filename,
},
async (conn, mek, m, { from, reply, args }) => {
    if (!args[0]) {
        return reply("*🏷️ ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴍᴇ ᴀ ʟɪɴᴋ.*");
    }

    try {
        const link = args[0];
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${link}`);
        const shortenedUrl = response.data;

        // Single "copy url" button so the shortened link can be tapped straight
        // into the clipboard instead of long-pressing the message text.
        try {
            await sendBtns(conn, from, {
                title: '🛡️ SHORT URL',
                text: `*🛡️ YOUR SHORTENED URL*\n\n${shortenedUrl}`,
                buttons: [
                    { display_text: '📋 𝐂σρу 𝐔яℓ', copy_code: shortenedUrl }
                ]
            }, mek);
        } catch (e) {
            return reply(`*🛡️YOUR SHORTENED URL*\n\n${shortenedUrl}`);
        }
    } catch (e) {
        console.error("Error shortening URL:", e);
        return reply("An error occurred while shortening the URL. Please try again.");
    }
});
