const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter;

const initializeTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  return transporter;
};

/**
 * Send email
 * @param {Object} options - Email options
 * @returns {Promise}
 */
const sendEmail = async (options) => {
  try {
    // Check if email is enabled
    if (process.env.ALERT_EMAIL_ENABLED !== 'true') {
      console.log('📧 Email alerts disabled, skipping email');
      return { skipped: true };
    }

    const transport = initializeTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'UptimeMonitor <noreply@uptimemonitor.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transport.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
};

/**
 * Send down alert email
 * @param {Object} user - User object
 * @param {Object} check - Check object
 * @param {Object} incident - Incident object
 */
const sendDownAlert = async (user, check, incident) => {
  const subject = `🚨 Alert: ${check.name} is DOWN`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none; }
        .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Check is DOWN</h1>
        </div>
        <div class="content">
          <p>Hello ${user.name},</p>
          <p>Your monitored service <strong>${check.name}</strong> is currently down.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Check Name:</span>
              <span class="value">${check.name}</span>
            </div>
            <div class="detail-row">
              <span class="label">URL:</span>
              <span class="value">${check.url}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value" style="color: #dc3545;">DOWN</span>
            </div>
            <div class="detail-row">
              <span class="label">Started At:</span>
              <span class="value">${new Date(incident.startedAt).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Reason:</span>
              <span class="value">${incident.failureReason || 'Unknown error'}</span>
            </div>
          </div>
          
          <p>We will continue monitoring and notify you when the service recovers.</p>
          
          <center>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/checks/${check._id}" class="button">
              View Details
            </a>
          </center>
        </div>
        <div class="footer">
          <p>You're receiving this because you have monitoring enabled for this check.</p>
          <p>© ${new Date().getFullYear()} UptimeMonitor - Keeping your services online</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Alert: ${check.name} is DOWN

Your monitored service "${check.name}" is currently down.

Details:
- URL: ${check.url}
- Status: DOWN
- Started At: ${new Date(incident.startedAt).toLocaleString()}
- Reason: ${incident.failureReason || 'Unknown error'}

We will continue monitoring and notify you when the service recovers.

View details: ${process.env.CLIENT_URL || 'http://localhost:5173'}/checks/${check._id}
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
};

/**
 * Send recovery alert email
 * @param {Object} user - User object
 * @param {Object} check - Check object
 * @param {Object} incident - Incident object
 */
const sendRecoveryAlert = async (user, check, incident) => {
  const subject = `✅ Recovered: ${check.name} is back UP`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none; }
        .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Service Recovered</h1>
        </div>
        <div class="content">
          <p>Hello ${user.name},</p>
          <p>Great news! Your monitored service <strong>${check.name}</strong> has recovered and is back online.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Check Name:</span>
              <span class="value">${check.name}</span>
            </div>
            <div class="detail-row">
              <span class="label">URL:</span>
              <span class="value">${check.url}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value" style="color: #28a745;">UP</span>
            </div>
            <div class="detail-row">
              <span class="label">Downtime Duration:</span>
              <span class="value">${incident.duration || 0} minutes</span>
            </div>
            <div class="detail-row">
              <span class="label">Recovered At:</span>
              <span class="value">${new Date(incident.resolvedAt).toLocaleString()}</span>
            </div>
          </div>
          
          <p>Your service is now responding normally.</p>
          
          <center>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/checks/${check._id}" class="button">
              View Details
            </a>
          </center>
        </div>
        <div class="footer">
          <p>You're receiving this because you have monitoring enabled for this check.</p>
          <p>© ${new Date().getFullYear()} UptimeMonitor - Keeping your services online</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Recovery: ${check.name} is back UP

Great news! Your monitored service "${check.name}" has recovered and is back online.

Details:
- URL: ${check.url}
- Status: UP
- Downtime Duration: ${incident.duration || 0} minutes
- Recovered At: ${new Date(incident.resolvedAt).toLocaleString()}

Your service is now responding normally.

View details: ${process.env.CLIENT_URL || 'http://localhost:5173'}/checks/${check._id}
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
};

module.exports = {
  sendEmail,
  sendDownAlert,
  sendRecoveryAlert
};