const EMAIL_TIMEOUT_MS = 10 * 1000;

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    if (process.env.NODE_ENV !== "production") console.info(`Email not configured. Intended recipient: ${to}; subject: ${subject}`);
    return false;
  }
  // A stalled upstream must not hold a password-reset/verify request forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }), signal: controller.signal });
    if (!response.ok) throw new Error("Unable to send email");
    return true;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendEmail };
