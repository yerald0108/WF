// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

/**
 * Configuración del transportador de email
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Para desarrollo, en producción considera quitarlo
    }
  });
};

/**
 * Enviar email genérico
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
};

/**
 * Email de verificación de cuenta
 */
const sendVerificationEmail = async (email, token, userName) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { 
          display: inline-block; 
          background: #2563eb; 
          color: white; 
          padding: 12px 30px; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Bienvenido a Ferretería Online!</h1>
        </div>
        <div class="content">
          <h2>Hola ${userName},</h2>
          <p>Gracias por registrarte en nuestra tienda. Para completar tu registro, por favor verifica tu correo electrónico.</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verificar mi Email</a>
          </div>

          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>

          <p style="margin-top: 30px; color: #666;">
            <strong>Este enlace expirará en 24 horas.</strong>
          </p>

          <p>Si no te registraste en nuestra tienda, puedes ignorar este correo.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Ferretería Online. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hola ${userName},
    
    Gracias por registrarte en Ferretería Online.
    
    Para verificar tu email, visita este enlace: ${verificationUrl}
    
    Este enlace expirará en 24 horas.
    
    Si no te registraste, ignora este correo.
  `;

  return sendEmail({
    to: email,
    subject: '✅ Verifica tu cuenta - Ferretería Online',
    html,
    text
  });
};

/**
 * Email de recuperación de contraseña
 */
const sendPasswordResetEmail = async (email, token, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { 
          display: inline-block; 
          background: #dc2626; 
          color: white; 
          padding: 12px 30px; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 20px 0;
        }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Recuperación de Contraseña</h1>
        </div>
        <div class="content">
          <h2>Hola ${userName},</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Ferretería Online.</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
          </div>

          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>

          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Este enlace expirará en 1 hora</li>
              <li>Solo puedes usar este enlace una vez</li>
              <li>Si no solicitaste este cambio, ignora este correo</li>
            </ul>
          </div>

          <p>Si tienes algún problema, contáctanos.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Ferretería Online. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hola ${userName},
    
    Recibimos una solicitud para restablecer tu contraseña.
    
    Para crear una nueva contraseña, visita este enlace: ${resetUrl}
    
    Este enlace expirará en 1 hora.
    
    Si no solicitaste este cambio, ignora este correo.
  `;

  return sendEmail({
    to: email,
    subject: '🔒 Recuperación de Contraseña - Ferretería Online',
    html,
    text
  });
};

/**
 * Email de confirmación de orden
 */
const sendOrderConfirmationEmail = async (email, orderData) => {
  const { 
    orderNumber, 
    userName, 
    total, 
    items, 
    shippingAddress,
    paymentMethod 
  } = orderData;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        ${item.product_name}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        $${parseFloat(item.unit_price).toFixed(2)}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        $${parseFloat(item.total).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .order-info { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; padding: 10px; text-align: left; }
        .total { background: #fef3c7; padding: 15px; margin: 20px 0; text-align: right; font-size: 18px; font-weight: bold; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ ¡Orden Confirmada!</h1>
        </div>
        <div class="content">
          <h2>Hola ${userName},</h2>
          <p>Gracias por tu compra. Hemos recibido tu orden y la estamos procesando.</p>

          <div class="order-info">
            <p><strong>Número de Orden:</strong> ${orderNumber}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CU', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p><strong>Método de Pago:</strong> ${paymentMethod}</p>
          </div>

          <h3>Resumen de la Orden:</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">Precio Unit.</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total">
            TOTAL: $${parseFloat(total).toFixed(2)}
          </div>

          <div class="order-info">
            <h3>Dirección de Envío:</h3>
            <p>${shippingAddress.street}</p>
            <p>${shippingAddress.city}, ${shippingAddress.province}</p>
            ${shippingAddress.references ? `<p><em>${shippingAddress.references}</em></p>` : ''}
          </div>

          <p>Te mantendremos informado sobre el estado de tu orden.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Ferretería Online. Todos los derechos reservados.</p>
          <p>Si tienes preguntas, contáctanos respondiendo a este correo.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `✅ Orden Confirmada #${orderNumber} - Ferretería Online`,
    html
  });
};

/**
 * Email de cambio de estado de orden
 */
const sendOrderStatusUpdateEmail = async (email, orderData) => {
  const { orderNumber, userName, status, statusMessage, trackingNumber } = orderData;

  const statusEmojis = {
    'confirmed': '✅',
    'processing': '📦',
    'ready': '🚚',
    'shipped': '🛫',
    'delivered': '✨',
    'cancelled': '❌'
  };

  const emoji = statusEmojis[status] || '📋';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .status { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
        .status h2 { color: #6366f1; margin: 0; }
        .tracking { background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${emoji} Actualización de tu Orden</h1>
        </div>
        <div class="content">
          <h2>Hola ${userName},</h2>
          <p>Tu orden <strong>#${orderNumber}</strong> ha sido actualizada.</p>

          <div class="status">
            <h2>${statusMessage}</h2>
          </div>

          ${trackingNumber ? `
            <div class="tracking">
              <p><strong>📍 Número de Seguimiento:</strong></p>
              <p style="font-size: 18px; text-align: center; color: #2563eb;">${trackingNumber}</p>
            </div>
          ` : ''}

          <p>Puedes ver los detalles completos de tu orden en tu cuenta.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Ferretería Online. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${emoji} Actualización: Orden #${orderNumber} - ${statusMessage}`,
    html
  });
};

/**
 * Verificar configuración de email
 */
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Configuración de email verificada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error en la configuración de email:', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  verifyEmailConfig
};