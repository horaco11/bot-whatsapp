import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import OpenAI from "openai";

// 🔑 Claves de entorno
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Ruta principal que Twilio usará para enviar mensajes
app.post("/webhook", async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const message = req.body.Body || "";
  const from = req.body.From || "";

  console.log(`Mensaje recibido de ${from}: ${message}`);

  try {
    // Enviar mensaje a ChatGPT
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente virtual de un servicio técnico de PC. Responde de forma amable y profesional. Ofrece diagnósticos básicos y la opción de agendar turnos.",
        },
        { role: "user", content: message },
      ],
    });

    const reply = response.choices[0].message.content;
    twiml.message(reply);

  } catch (error) {
    console.error("Error:", error);
    twiml.message("Disculpá, hubo un error al procesar tu mensaje.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

// Puerto dinámico para hosting
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));