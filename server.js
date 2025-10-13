import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const ACCESS_TOKEN = "APP_USR-4643369270008836-101220-29b0c1ee3c2dd02eb8d1d8e082c445b5-2919258415";

app.post("/crear-preferencia", async (req, res) => {
  try {
    const { title, price } = req.body; // <-- recibimos los datos desde el frontend

    if (!title || !price) {
      return res.status(400).json({ error: "Faltan datos del producto o precio" });
    }

    const body = {
      items: [
        {
          title: title,
          quantity: 1,
          currency_id: "MXN",
          unit_price: Number(price),
        },
      ],
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

app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Servidor corriendo en puerto ${process.env.PORT || 3000}`)
);

