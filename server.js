import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { MongoClient } from "mongodb";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// 🧩 URI de MongoDB Atlas
const uri = "mongodb+srv://computechhUser:computechh2025@computechhcluster.lvicnan.mongodb.net/computechh?retryWrites=true&w=majority&appName=computechhCluster";
let client;

// 🧠 Conexión a MongoDB
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
 * 🔐 ENDPOINTS DE USUARIO (LOGIN / REGISTRO)
 ***********************************/

// Crear cuenta
app.post("/registro", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const db = client.db("computechh");
    const usuarios = db.collection("usuarios");

    // Verificar si el usuario ya existe
    const existente = await usuarios.findOne({ email });
    if (existente) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // Crear nuevo usuario
    await usuarios.insertOne({ nombre, email, password });
    console.log(`✅ Usuario registrado: ${email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en /registro:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Iniciar sesión
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = client.db("computechh");
    const usuarios = db.collection("usuarios");

    const user = await usuarios.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    console.log(`✅ Usuario inició sesión: ${email}`);
    res.json({
      ok: true,
      nombre: user.nombre,
      email: user.email,
    });
  } catch (err) {
    console.error("❌ Error en /login:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

/***********************************
 * 🧩 ENDPOINTS DE STOCK (MONGODB)
 ***********************************/
app.get("/stock", async (req, res) => {
  try {
    if (!client) throw new Error("MongoDB no inicializado");
    const db = client.db("computechh");
    const collection = db.collection("stock");

    const items = await collection.find().toArray();
    const stockData = {};
    items.forEach(item => stockData[item.name] = item.stock);

    res.json(stockData);
  } catch (err) {
    console.error("❌ Error al obtener stock:", err);
    res.status(500).json({ error: "Error al obtener stock" });
  }
});

app.post("/actualizar-stock", async (req, res) => {
  try {
    if (!client) throw new Error("MongoDB no inicializado");
    const nuevoStock = req.body;

    if (!nuevoStock || Object.keys(nuevoStock).length === 0) {
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
 * 🪙 MERCADO PAGO (YA EXISTENTE)
 ***********************************/
app.post("/crear-preferencia", async (req, res) => {
  try {
    const { title, price } = req.body;
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer TEST-XXXX`, // tu token de prueba
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ title, quantity: 1, currency_id: "MXN", unit_price: price }],
        back_urls: {
          success: "https://computechh.netlify.app/pago-exitoso.html",
          failure: "https://computechh.netlify.app/pago-fallido.html",
          pending: "https://computechh.netlify.app/pago-pendiente.html",
        },
        auto_return: "approved",
      }),
    });

    const data = await response.json();
    res.json({ url: data.init_point });
  } catch (err) {
    console.error("Error al crear preferencia:", err);
    res.status(500).json({ error: "Error al crear preferencia" });
  }
});

/***********************************
 * 🚀 SERVIDOR
 ***********************************/
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
