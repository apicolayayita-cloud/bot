 require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "MI_TOKEN_SECRETO";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

async function sendWhatsAppMessage(to, message) {
  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      data: { messaging_product: 'whatsapp', to, text: { body: message } }
    });
  } catch (error) {
    console.error("❌ Error al enviar mensaje a WhatsApp:", error.response?.data || error.message);
  }
}

app.get('/', (req, res) => res.send('SpeedyBites Bot Activo'));

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (message) {
    const userPhone = message.from;
    const userText = message.text.body;

    console.log(`📩 Mensaje de ${userPhone}: ${userText}`);

    // Generar respuesta con Gemini
    const result = await model.generateContent(`Eres un asistente de restaurante llamado SpeedyBites. Responde de forma amable y concisa. Usuario dice: ${userText}`);
    const responseText = result.response.text();

    // Enviar respuesta a WhatsApp
    await sendWhatsAppMessage(userPhone, responseText);
  }

  res.status(200).send('EVENT_RECEIVED');
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));