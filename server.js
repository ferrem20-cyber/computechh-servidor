import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import "dotenv/config";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

// ======== CONFIGURACIÓN DEL SERVIDOR ========
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["https://computechh.netlify.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

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

// ======== ENDPOINT: REGISTRO ========
app.post("/registro", async (req, res) => {
  try {
    const { nombre, apellidos, email, password } = req.body;
    if (!nombre || !email || !password)
      return res.status(400).json({ error: "Faltan datos obligatorios." });

    const usuarios = db.collection("usuarios");
    const existe = await usuarios.findOne({ email });
    if (existe)
      return res.status(409).json({ error: "El correo ya está registrado." });

    const nuevoUsuario = {
      nombre,
      apellidos,
      email,
      password,
      fechaRegistro: new Date(),
    };

    await usuarios.insertOne(nuevoUsuario);
    res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      usuario: { nombre, email },
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
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    if (user.password !== password)
      return res.status(401).json({ error: "Contraseña incorrecta." });

    res.json({
      mensaje: "Inicio de sesión exitoso",
      usuario: { nombre: user.nombre, email: user.email },
    });
  } catch (error) {
    console.error("Error en /login:", error);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// ======== ENDPOINT: MERCADO PAGO ========
app.post("/crear-preferencia", async (req, res) => {
  try {
    const { title, price } = req.body;
    if (!title || !price)
      return res
        .status(400)
        .json({ error: "Faltan datos del producto o precio" });

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

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (data.init_point) res.json({ url: data.init_point });
    else res.status(500).json({ error: "No se pudo crear la preferencia" });
  } catch (error) {
    console.error("Error del servidor:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ======== ENDPOINT: RECUPERAR CONTRASEÑA ========
app.post("/recuperar", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ error: "El correo es obligatorio." });

    const usuarios = db.collection("usuarios");
    const usuario = await usuarios.findOne({ email });

    if (!usuario)
      return res.status(404).json({ error: "No existe una cuenta con ese correo." });

    // Solo confirma que existe para redirigir al paso de cambio
    res.json({ mensaje: "Usuario encontrado", email: usuario.email });
  } catch (error) {
    console.error("❌ Error en /recuperar:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ======== ENDPOINT: CAMBIAR CONTRASEÑA ========
app.post("/cambiar", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Correo y nueva contraseña requeridos." });

    const usuarios = db.collection("usuarios");
    const usuario = await usuarios.findOne({ email });
    if (!usuario)
      return res.status(404).json({ error: "Usuario no encontrado." });

    await usuarios.updateOne({ email }, { $set: { password } });

    res.json({ mensaje: "Contraseña actualizada con éxito", nombre: usuario.nombre });
  } catch (error) {
    console.error("❌ Error en /cambiar:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ======= DIRECCIONES DEL USUARIO =======

// ======= DIRECCIONES DEL USUARIO (versión corregida) =======

// Guardar una nueva dirección
app.post("/guardar-direccion", async (req, res) => {
  try {
    const { email, nombre, direccion, ciudad, estado, cp } = req.body;

    if (!email || !nombre || !direccion || !ciudad || !estado || !cp) {
      return res.status(400).json({ error: "Faltan datos para guardar la dirección." });
    }

    const usuarios = db.collection("usuarios");
    const user = await usuarios.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    // Añadir dirección
    const nuevaDireccion = { nombre, direccion, ciudad, estado, cp };
    const direcciones = user.direcciones || [];
    direcciones.push(nuevaDireccion);

    await usuarios.updateOne({ email }, { $set: { direcciones } });

    res.json({ ok: true, message: "Dirección guardada correctamente." });
  } catch (error) {
    console.error("❌ Error al guardar dirección:", error);
    res.status(500).json({ error: "Error al guardar dirección." });
  }
});

// Obtener todas las direcciones del usuario
app.get("/direcciones/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const usuarios = db.collection("usuarios");
    const user = await usuarios.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    res.json(user.direcciones || []);
  } catch (error) {
    console.error("❌ Error al obtener direcciones:", error);
    res.status(500).json({ error: "Error al obtener direcciones." });
  }
});


// ======= HISTORIAL DE ÓRDENES DEL USUARIO =======

// ======= HISTORIAL DE ÓRDENES =======

// Guardar una nueva orden
app.post("/guardar-orden", async (req, res) => {
  try {
    const { email, productos, total, metodoPago, estado } = req.body;

    if (!email || !productos || productos.length === 0 || !total) {
      return res.status(400).json({ error: "Datos incompletos para registrar la orden." });
    }

    const usuarios = db.collection("usuarios");
    const user = await usuarios.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    const nuevaOrden = {
      productos,
      total,
      metodoPago: metodoPago || "Mercado Pago",
      estado: estado || "pendiente",
      fecha: new Date(),
    };

    const ordenes = user.ordenes || [];
    ordenes.push(nuevaOrden);

    await usuarios.updateOne({ email }, { $set: { ordenes } });

    res.json({ ok: true, message: "Orden guardada correctamente." });
  } catch (error) {
    console.error("❌ Error al guardar orden:", error);
    res.status(500).json({ error: "Error al guardar orden." });
  }
});

// Obtener todas las órdenes de un usuario
app.get("/ordenes/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const usuarios = db.collection("usuarios");
    const user = await usuarios.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    res.json(user.ordenes || []);
  } catch (error) {
    console.error("❌ Error al obtener órdenes:", error);
    res.status(500).json({ error: "Error al obtener órdenes." });
  }
});



// ======== INICIAR SERVIDOR ========
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  await conectarDB();
});

/***********************************
 * 🧩 ENDPOINTS DE STOCK GLOBAL
 ***********************************/
import fs from "fs";

const STOCK_FILE = "./stock.json";

// 🔹 Obtener stock actual
app.get("/stock", (req, res) => {
  try {
    if (!fs.existsSync(STOCK_FILE)) {
      fs.writeFileSync(STOCK_FILE, JSON.stringify({}), "utf8");
    }
    const data = fs.readFileSync(STOCK_FILE, "utf8");
    res.json(JSON.parse(data || "{}"));
  } catch (err) {
    console.error("Error leyendo stock.json:", err);
    res.status(500).json({ error: "Error al obtener stock" });
  }
});

// 🔹 Actualizar stock
app.post("/actualizar-stock", async (req, res) => {
  try {
    const nuevoStock = req.body;
    fs.writeFileSync(STOCK_FILE, JSON.stringify(nuevoStock, null, 2), "utf8");
    console.log("✅ Stock actualizado:", nuevoStock);
    res.json({ success: true });
  } catch (err) {
    console.error("Error actualizando stock:", err);
    res.status(500).json({ error: "Error al guardar stock" });
  }
});

