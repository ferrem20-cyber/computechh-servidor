import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function enviarCorreoPrueba() {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Computechh Soporte" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "✅ Prueba de correo desde Computechh (Gmail)",
      text: "Hola Juan, este es un correo de prueba enviado desde tu servidor Node.js con Gmail.",
      html: `<h2>Correo de prueba</h2><p>Todo funciona correctamente 🚀</p>`,
    });

    console.log("📨 Correo enviado correctamente:", info.response);
  } catch (error) {
    console.error("❌ Error al enviar el correo:", error);
  }
}

enviarCorreoPrueba();
