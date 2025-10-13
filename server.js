import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());

// ======== CONFIGURAR CORS CORRECTAMENTE ========
app.use(cors({
  origin: "https://computechh.netlify.app", // ✅ dominio real de tu frontend en Netlify
  methods: ["GET", "POST"],
  credentials: false
}));

// ======== TOKEN REAL DE MERCADO PAGO ========
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; 

// ======== ENDPOINT PARA CREAR PREFERENCIA ========
app.post("/crear-preferencia", async (req, res) => {
  try {
    const { title, price } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: "Faltan datos del producto o precio" });
    }

    const body = {
      items: [
        {
          title,
          quantity: 1,
          currency_id: "MXN",
          unit_price: Number(price),
        },
      ],

        payer: {
          email: "cliente@computechh.com",
          },
      back_urls: {
        success: "https://computechh.netlify.app/success.html",
        failure: "https://computechh.netlify.app/failure.html",
        pending: "https://computechh.netlify.app/pending.html",
      },
      auto_return: "approved",
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.init_point) {
      res.json({ url: data.init_point });
    } else {
      console.error("Error al crear preferencia:", data);
      res.status(500).json({ error: "No se pudo crear la preferencia de pago", data });
    }
  } catch (error) {
    console.error("Error del servidor:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ======== PUERTO DE RENDER ========
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));


