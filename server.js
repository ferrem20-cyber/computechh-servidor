/***********************************
 * 🧩 IMPORTACIONES PRINCIPALES
 ***********************************/
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/***********************************
 * 🧩 CONEXIÓN A MONGODB ATLAS
 ***********************************/
const uri = "mongodb+srv://computechhUser:computechh2025@computechhcluster.lvicnan.mongodb.net/computechh?retryWrites=true&w=majority&appName=computechhCluster";
let client;

async function conectarDB() {
  try {
    console.log("🧩 Intentando conectar a MongoDB con URI:", uri);
    client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Conectado a MongoDB Atlas correctamente");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err);
  }
}
await conectarDB();

/***********************************
 * 🧩 ENDPOINTS DE STOCK (USANDO MONGODB)
 ***********************************/
app.get("/stock", async (req, res) => {
  try {
    if (!client) throw new Error("Cliente MongoDB no inicializado");

    const db = client.db("computechh");
    const collection = db.collection("stock");
    const items = await collection.find().toArray();

    const stockData = {};
    items.forEach(item => {
      stockData[item.name] = item.stock;
    });

    res.json(stockData);
  } catch (err) {
    console.error("❌ Error al obtener stock:", err);
    res.status(500).json({ error: "Error al obtener stock" });
  }
});

app.post("/actualizar-stock", async (req, res) => {
  try {
    if (!client) throw new Error("Cliente MongoDB no inicializado");

    console.log("📩 Datos recibidos del frontend:", req.body);

    // Aseguramos que req.body sea un objeto válido
    const nuevoStock = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");

    if (Object.keys(nuevoStock).length === 0) {
      console.warn("⚠️ No se recibieron datos válidos de stock.");
      return res.status(400).json({ error: "Cuerpo vacío o inválido" });
    }

    const db = client.db("computechh");
    const collection = db.collection("stock");

    await collection.deleteMany({});
    const docs = Object.entries(nuevoStock).map(([name, stock]) => ({ name, stock }));
    await collection.insertMany(docs);

    console.log("✅ Stock actualizado en MongoDB:", docs);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error al guardar stock:", err);
    res.status(500).json({ error: "Error al guardar stock" });
  }
});

/***********************************
 * 💳 MERCADO PAGO (Checkout)
 ***********************************/
app.post("/crear-preferencia", async (req, res) => {
  try {
    const { title, price } = req.body;
    const body = {
      items: [
        {
          title,
          quantity: 1,
          currency_id: "MXN",
          unit_price: Number(price),
        },
      ],
      back_urls: {
        success: "https://computechh.netlify.app/pago-exitoso.html",
        failure: "https://computechh.netlify.app/pago-fallido.html",
        pending: "https://computechh.netlify.app/pago-pendiente.html",
      },
      auto_return: "approved",
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer TEST-INSERTA-AQUI-TU-TOKEN`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.json({ url: data.init_point });
  } catch (err) {
    console.error("❌ Error creando preferencia:", err);
    res.status(500).json({ error: "Error al crear preferencia de pago" });
  }
});

/***********************************
 * 🚀 SERVIDOR ONLINE
 ***********************************/
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
