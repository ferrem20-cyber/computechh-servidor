import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { MongoClient } from "mongodb";
import fs from "fs";
import nodemailer from "nodemailer";

// 🔹 Configurar transporte de correo (usando Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "computechh.soporte@gmail.com", // tu correo remitente
    pass: "ixuihueymzlramqp", // se genera desde Gmail (te explico abajo)
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
 * 📦 ENDPOINTS DE DIRECCIONES (MONGODB)
 ***********************************/
app.post("/guardar-direccion", async (req, res) => {
  try {
    const { email, nombre, direccion, ciudad, estado, cp } = req.body;

    if (!email || !direccion) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const db = client.db("computechh");
    const direcciones = db.collection("direcciones");

    await direcciones.insertOne({
      email,
      nombre,
      direccion,
      ciudad,
      estado,
      cp,
      fecha: new Date()
    });

    console.log(`✅ Dirección guardada para ${email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en /guardar-direccion:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

app.get("/direcciones/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const db = client.db("computechh");
    const direcciones = db.collection("direcciones");

    const resultados = await direcciones.find({ email }).toArray();
    res.json(resultados);
  } catch (err) {
    console.error("❌ Error en /direcciones/:email:", err);
    res.status(500).json({ error: "Error al obtener direcciones" });
  }
});

/***********************************
 * 🧾 REGISTRAR PEDIDO Y ENVIAR CORREO HTML
 ***********************************/
app.post("/registrar-pedido", async (req, res) => {
  try {
    const pedido = req.body;
    if (!pedido || !pedido.email || !pedido.productos) {
      return res.status(400).json({ ok: false, error: "Datos de pedido incompletos" });
    }

    // 🧠 Guardar pedido en MongoDB
    const db = client.db("computechh");
    const pedidos = db.collection("pedidos");
    await pedidos.insertOne({ ...pedido, fecha: new Date() });

    // 🧾 Generar tabla de productos
    const productosHTML = pedido.productos
      .map(
        (p) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #ddd;">${p.nombre}</td>
          <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">${p.cantidad}</td>
          <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">$${p.precio_unitario.toLocaleString()}</td>
        </tr>`
      )
      .join("");

    // 💌 Plantilla de correo con formato HTML
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#f9fafb;">
        <div style="background:#0f172a;color:white;padding:20px;text-align:center;">
          <h2 style="margin:0;">🧾 Nueva compra en Computechh</h2>
        </div>

        <div style="padding:20px;">
          <h3>📦 Detalles del comprador</h3>
          <p><strong>Nombre:</strong> ${pedido.nombre}</p>
          <p><strong>Correo:</strong> ${pedido.email}</p>
          <p><strong>Teléfono:</strong> ${pedido.telefono}</p>
          <p><strong>Dirección:</strong> ${pedido.direccion}, ${pedido.ciudad}, ${pedido.estado}, CP ${pedido.cp}</p>

          <h3>🧰 Productos</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#e2e8f0;">
                <th style="padding:8px;text-align:left;">Producto</th>
                <th style="padding:8px;text-align:center;">Cant.</th>
                <th style="padding:8px;text-align:right;">Precio</th>
              </tr>
            </thead>
            <tbody>${productosHTML}</tbody>
          </table>

          <h2 style="text-align:right;margin-top:20px;">💰 Total: $${pedido.total.toLocaleString()}</h2>
        </div>

        <div style="background:#0f172a;color:white;padding:10px;text-align:center;font-size:14px;">
          <p>© ${new Date().getFullYear()} Computechh | computechh.soporte@gmail.com</p>
        </div>
      </div>
    `;

    // 📧 Enviar correo a tu cuenta de soporte
    await transporter.sendMail({
      from: '"Computechh Ventas" <computechh.soporte@gmail.com>',
      to: "computechh.soporte@gmail.com", // puedes agregar más destinatarios separados por coma
      subject: "🧾 Nueva compra en Computechh",
      html,
    });

    console.log("✅ Pedido guardado y correo HTML enviado correctamente");
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error registrando pedido:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});



/***********************************
 * 🪙 MERCADO PAGO (YA EXISTENTE)
 ***********************************/
app.post("/crear-preferencia", async (req, res) => {
  try {
    const { title, price } = req.body;

    console.log("🛒 Creando preferencia con:", { title, price });

    if (!title || !price || isNaN(price) || price <= 0) {
      console.error("❌ Precio inválido recibido:", price);
      return res.status(400).json({ error: "Precio inválido o faltante" });
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer APP_USR-4643369270008836-101220-29b0c1ee3c2dd02eb8d1d8e082c445b5-2919258415`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });

    const data = await response.json();
    console.log("💳 Respuesta de Mercado Pago:", data);

    if (!data.init_point) {
      console.error("❌ No se recibió init_point:", data);
      return res.status(400).json({ error: "Error al crear preferencia", detalle: data });
    }

    res.json({ url: data.init_point });
  } catch (err) {
    console.error("❌ Error creando preferencia:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

/***********************************
 * 🚀 SERVIDOR
 ***********************************/
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
