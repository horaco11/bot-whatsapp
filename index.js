import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// 🔑 Clave Groq (guardala como variable de entorno en Render)
const GROQ_API_KEY = process.env.GROQ_API_KEY || "TU_API_KEY_GROQ";

// --- FUNCIÓN PARA CONSULTAR A GROQ (con log interno y silencio al usuario) ---
async function getGroqResponse(prompt, from) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Sos un asistente virtual de un servicio técnico de PC. Responde de forma amable y profesional. Ofrecé diagnósticos básicos y la opción de agendar turnos." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || "Error desconocido";

      // --- LOG INTERNO CLARO PARA RENDER ---
      if (response.status === 429 || errorData.error?.code === 'rate_limit_exceeded') {
        console.log(`RATE_LIMIT_EXCEEDED | Modelo: llama-3.3-70b-versatile | Usuario: ${from} | Detalle: ${errorMessage}`);
        return null; // ← Silencio al usuario
      }

      // Otros errores (500, 400, etc.)
      console.error(`GROQ_ERROR_${response.status} | Usuario: ${from} | ${errorMessage}`);
      return "Hubo un problema temporal. Intentá de nuevo en unos minutos.";
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || "No pude generar respuesta.";

  } catch (err) {
    console.error(`CONNECTION_ERROR | Usuario: ${from} | ${err.message}`);
    return "Error de conexión. Intentá más tarde.";
  }
}

// --- WEBHOOK PARA MENSAJES DE WHATSAPP ---
app.post("/webhook", async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const message = (req.body.Body || "").trim();
  const from = req.body.From || "desconocido";

  console.log(`MENSAJE_RECIBIDO | De: ${from} | Contenido: "${message}"`);

  if (!message) {
    twiml.message("Escribí tu consulta para ayudarte.");
    return res.type("text/xml").send(twiml.toString());
  }

  const reply = await getGroqResponse(message, from);

  // SI ES NULL → NO RESPONDER NADA (silencio controlado)
  if (reply === null) {
    console.log(`SILENCIO_ENVIADO | Motivo: Rate limit | Usuario: ${from}`);
    return res.type("text/xml").send(twiml.toString()); // TwiML vacío
  }

  // Respuesta normal
  twiml.message(reply);
  res.type("text/xml").send(twiml.toString());
});

// --- SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));