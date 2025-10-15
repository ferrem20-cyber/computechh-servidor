import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());

// ======== CONFIGURAR CORS CORRECTAMENTE ========
app.use(cors({
  origin: "https://computechh.netlify.app", // ✅ tu dominio real en Netlify
  methods: ["GET", "POST"],
  credentials: false
}));

// ======== TOKEN REAL DE MERCADO PAGO ========
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "TEST-xxxxxxxxxxxxxxxxxxxxxxxxxx"; // ⚠️ Usa tu token real o de prueba aquí

// ======== ENDPOINT PARA CREAR PREFERENCIA ========
app.post("/crear-preferencia", async (req, res) => {
  try {
    const { total, descripcion } = req.body; // ← ahora coincide con checkout.html

    if (!total) {
      return res.status(400).json({ error: "Falta el total de la compra" });
    }

    const body = {
      items: [
        {
          title: descripcion || "Compra en Computechh",
          quantity: 1,
          currency_id: "MXN",
          unit_price: Number(total),
        },
      ],
      payer: {
        email: "cliente@computechh.com", // opcional, puedes pasarlo dinámico luego
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
      res.json({ init_point: data.init_point }); // ✅ el frontend usa "init_point"
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
