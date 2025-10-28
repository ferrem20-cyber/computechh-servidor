import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { MongoClient, ObjectId } from "mongodb"; // ✅ AÑADIDO ObjectId
import fs from "fs";
import nodemailer from "nodemailer";

// 🔹 Configurar transporte de correo (usando Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "computechh.soporte@gmail.com",
    pass: "ixuihueymzlramqp",
  },
});

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
app.post("/registro", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const db = client.db("computechh");
    const usuarios = db.collection("usuarios");

    const existente = await usuarios.findOne({ email });
    if (existente) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    await usuarios.insertOne({ nombre, email, password });
    console.log(`✅ Usuario registrado: ${email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en /registro:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

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
 * 🧩 ENDPOINTS DE STOCK
 ***********************************/
app.get("/stock", async (req, res) => {
  try {
    const db = client.db("computechh");
    const collection = db.collection("stock");
    const items = await collection.find().toArray();
    const stockData = {};
    items.forEach(item => stockData[item.name] = item.stock);
    res.json(stockData);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener stock" });
  }
});

app.post("/actualizar-stock", async (req, res) => {
  try {
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
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar stock" });
  }
});

/***********************************
 * 📦 CRUD DIRECCIONES (MONGODB)
 ***********************************/

// ➕ Agregar dirección
app.post("/agregar-direccion", async (req, res) => {
  try {
    const { email, nombre, direccion, ciudad, estado, cp } = req.body;

    if (!email || !direccion) {
      return res.json({ ok: false });
    }

    const db = client.db("computechh");
    const direcciones = db.collection("direcciones");

    await direcciones.insertOne({ email, nombre, direccion, ciudad, estado, cp, fecha: new Date() });

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// ✏️ Editar dirección
app.put("/editar-direccion", async (req, res) => {
  try {
    const { id, nombre, direccion, ciudad, estado, cp } = req.body;

    if (!id) return res.json({ ok: false });

    const db = client.db("computechh");
    const direcciones = db.collection("direcciones");

    await direcciones.updateOne(
      { _id: new ObjectId(id) },
      { $set: { nombre, direccion, ciudad, estado, cp } }
    );

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// 🗑️ Eliminar dirección
app.delete("/eliminar-direccion/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.json({ ok: false });

    const db = client.db("computechh");
    const direcciones = db.collection("direcciones");

    await direcciones.deleteOne({ _id: new ObjectId(id) });

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// 📍 Obtener direcciones por email
app.get("/direcciones/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const db = client.db("computechh");
    const direcciones = db.collection("direcciones");

    const resultados = await direcciones.find({ email }).toArray();
    res.json(resultados);
  } catch (err) {
    res.json([]);
  }
});

/***********************************
 * 🧾 PEDIDOS / HISTORIAL
 ***********************************/
app.post("/registrar-pedido", async (req, res) => { /* ... SIN CAMBIOS ... */ });

app.get("/ordenes/:email", async (req, res) => { /* ... SIN CAMBIOS ... */ });

/***********************************
 * 🪙 MERCADO PAGO
 ***********************************/
app.post("/crear-preferencia", async (req, res) => { /* ... SIN CAMBIOS ... */ });

/***********************************
 * 🚀 SERVIDOR
 ***********************************/
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
