import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// 🔑 Clave Groq (guardala como variable de entorno en Render)
const GROQ_API_KEY = process.env.GROQ_API_KEY || "TU_API_KEY_GROQ";

// --- FUNCIÓN PARA CONSULTAR A GROQ ---
async function getGroqResponse(prompt) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "Sos un asistente virtual de un servicio técnico de PC. Responde de forma amable y profesional. Ofrecé diagnósticos básicos y la opción de agendar turnos." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("Error Groq:", data.error);
      return "Hubo un problema con el modelo de IA.";
    }

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error("Error al conectar con Groq:", err);
    return "Error al conectar con el modelo de IA.";
  }
}

// --- WEBHOOK PARA MENSAJES DE WHATSAPP ---
app.post("/webhook", async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const message = req.body.Body || "";
  const from = req.body.From || "";

  console.log(`Mensaje recibido de ${from}: ${message}`);

  try {
    const reply = await getGroqResponse(message);
    twiml.message(reply);
  } catch (error) {
    console.error("Error:", error);
    twiml.message("Disculpá, hubo un error al procesar tu mensaje.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

// --- SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));