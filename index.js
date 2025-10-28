import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import OpenAI from "openai";

// ✅ Inicialización de OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();

// ✅ Twilio envía los datos como application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// 🟢 Endpoint que Twilio usa para enviar mensajes entrantes
app.post("/webhook", async (req, res) => {
  // ✅ Importante: asegurarse de capturar el cuerpo correctamente
  const twiml = new twilio.twiml.MessagingResponse();
  const message = req.body.Body?.trim() || "";
  const from = req.body.From || "desconocido";

  console.log(`📩 Mensaje recibido de ${from}: ${message}`);

  try {
    // ✅ Llamada al modelo de OpenAI (API moderna)
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente virtual de un servicio técnico de PC. Respondé de forma amable y profesional. Ofrecé diagnósticos básicos y la opción de agendar turnos.",
        },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || 
                  "Disculpá, no entendí tu consulta.";

    // ✅ Twilio espera XML con <Response><Message>...</Message></Response>
    twiml.message(reply);

    res.type("text/xml");
    res.status(200).send(twiml.toString());

  } catch (error) {
    console.error("❌ Error procesando mensaje:", error);
    const errorReply = "Disculpá, hubo un error al procesar tu mensaje.";
    twiml.message(errorReply);
    res.type("text/xml");
    res.status(200).send(twiml.toString());
  }
});

// 🟢 Render asigna el puerto dinámicamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));