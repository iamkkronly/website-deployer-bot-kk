const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

app.use(express.json());

// Serve user websites at /user/<chat_id>
app.use('/user/:id', (req, res, next) => {
  const userPath = path.join(__dirname, 'sites', req.params.id);
  if (fs.existsSync(path.join(userPath, 'index.html'))) {
    express.static(userPath)(req, res, next);
  } else {
    res.status(404).send('❌ Website not found.');
  }
});

// Handle Telegram webhook
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const chatId = msg.chat.id.toString();

  if (msg.text === '/start') {
    await sendMessage(chatId, `👋 Welcome!\nSend me your website files: index.html, style.css, or script.js.\nYour site will be live at:\n🔗 https://${process.env.RENDER_EXTERNAL_HOSTNAME}/user/${chatId}`);
    return res.sendStatus(200);
  }

  if (msg.document) {
    const fileName = msg.document.file_name;
    const fileId = msg.document.file_id;
    const allowedFiles = ['index.html', 'style.css', 'script.js'];

    if (!allowedFiles.includes(fileName)) {
      await sendMessage(chatId, `❌ Only these files are allowed: ${allowedFiles.join(', ')}`);
      return res.sendStatus(200);
    }

    try {
      const fileRes = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const filePath = fileRes.data.result.file_path;
      const fileUrl = `${TELEGRAM_FILE_API}/${filePath}`;

      const userDir = path.join(__dirname, 'sites', chatId);
      fs.mkdirSync(userDir, { recursive: true });

      const file = await axios.get(fileUrl, { responseType: 'stream' });
      const dest = fs.createWriteStream(path.join(userDir, fileName));
      file.data.pipe(dest);

      dest.on('finish', async () => {
        await sendMessage(chatId, `✅ ${fileName} uploaded!\n🔗 View your site: https://${process.env.RENDER_EXTERNAL_HOSTNAME}/user/${chatId}`);
      });
    } catch (err) {
      await sendMessage(chatId, `⚠️ Upload failed: ${err.message}`);
    }
  }

  res.sendStatus(200);
});

// Send Telegram message
async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
