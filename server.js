import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import "dotenv/config";
import { MongoClient } from "mongodb";

// ======== CONFIGURACIÓN DEL SERVIDOR ========
const app = express();
app.use(express.json());

app.use(cors({
  origin: ["https://computechh.netlify.app", "http://localhost:3000"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));


// ======== VARIABLES DE ENTORNO ========
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

// ======== CONEXIÓN A MONGODB ========
let db;

async function conectarDB() {
  try {
    console.log("🧩 Intentando conectar a MongoDB con URI:", MONGO_URI);
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db("computechh");
    console.log("✅ Conectado a MongoDB Atlas correctamente");
  } catch (error) {
    console.error("❌ Error al conectar con MongoDB:", error);
  }
}

// ======== ENDPOINT: REGISTRO DE USUARIO ========
app.post("/registro", async (req, res) => {
  try {
    const { nombre, apellidos, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    const usuarios = db.collection("usuarios");

    const existe = await usuarios.findOne({ email });
    if (existe) {
      return res.status(409).json({ error: "El correo ya está registrado." });
    }

    const nuevoUsuario = {
      nombre,
      apellidos,
      email,
      password,
      fechaRegistro: new Date()
    };

    await usuarios.insertOne(nuevoUsuario);

    res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      usuario: { nombre, email }
    });

  } catch (error) {
    console.error("Error en /registro:", error);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// ======== ENDPOINT: LOGIN ========
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuarios = db.collection("usuarios");

    const user = await usuarios.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    res.json({
      mensaje: "Inicio de sesión exitoso",
      usuario: { nombre: user.nombre, email: user.email }
    });

  } catch (error) {
    console.error("Error en /login:", error);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// ======== ENDPOINT MERCADO PAGO ========
app.post("/crear-preferencia", async (req, res) => {
  try {
    const { title, price } = req.body;
    if (!title || !price) return res.status(400).json({ error: "Faltan datos del producto o precio" });

    const body = {
      items: [
        { title, quantity: 1, currency_id: "MXN", unit_price: Number(price) },
      ],
      payer: { email: "cliente@computechh.com" },
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

// ======== INICIAR SERVIDOR ========
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  await conectarDB();
});
