<h1 align="center">〘 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 𝐌𝐈𝐍𝐈 〙</h1>

<p align="center">
  <img src="https://files.catbox.moe/ejufwa.jpg" alt="FAIZAN-MD-MINI" width="500" style="border-radius:20px;"/>
</p>

<p align="center"><b>⚡ FAIZAN-MD Mini — Pairing-Code + MongoDB session WhatsApp Bot ⚡</b></p>

---

## ✨ Mini kya hai?

Ye **mini** version hai — SESSION_ID file ki jagah:
- 🔗 Ek **pairing web page** (`/pair`) — number daalo, 8-digit code milega, WhatsApp mein Link a Device se paste karo.
- 🗄️ Session **MongoDB** mein store hoti hai (multi-number support).
- 🪶 Lightweight command set.

---

## 🚀 Deploy Steps

1. Is repo ko apne GitHub par fork/upload karo.
2. **MongoDB Atlas** par free cluster banao aur connection string lo.
3. Host (Heroku / Koyeb / Render / VPS) par ye env variables set karo:

| Variable | Zaroori | Misaal |
|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?appName=Cluster0` |
| `OWNER_NUMBER` | ❌ | `923266105873` |
| `PREFIX` | ❌ | `.` |
| `SESSION_ID` | ❌ | `FAIZAN-MD-MINI` |
| `WORK_TYPE` | ❌ | `public` |
| `QASIM_API_KEY` | ❌ | `qasim-dev` |

4. Deploy karo. Server chalne par browser mein kholo: `https://<your-app-url>/pair`
5. Apna WhatsApp number daalo → code copy karo → WhatsApp → **Linked Devices → Link a Device → Link with phone number** → code paste.
6. Threads downloader ke liye `QASIM_API_KEY` environment variable set karo. Custom key na ho to plugin documented default `qasim-dev` use karega. `.threads` command ke baad Video ya Image button select kar sakte ho.
7. Ho gaya ✅ — bot connect ho jayega.

> Local test: `npm install` phir `npm start`, aur `http://localhost:8000/pair` kholo.

---

## ⚙️ Config

Saari settings `config.js` ya env variables se control hoti hain (owner, prefix, auto-view/like status, anti-call, images, channel link waghera).

---

## 📡 Links

- 📢 Channel: https://whatsapp.com/channel/0029VbBdQyRBPzjUMvx8Fb2g
- 👤 Owner: wa.me/923266105873

---

## ⚠️ Reminder

- Ye bot WhatsApp Inc. se affiliated nahi hai.
- Ghalat istemaal se number ban ho sakta hai.
- Learning & fun ke liye — credits mat hatao.

<p align="center"><b>© POWERED BY FAIZAN-MD</b></p>
