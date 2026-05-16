import "server-only";

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, "https://") ||
    "http://127.0.0.1:3000"
  );
}

export async function sendInviteEmail(input: { email: string; token: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "File Vault";

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL is not configured.");
  }

  const setupUrl = `${getAppUrl().replace(/\/$/, "")}/setup?token=${encodeURIComponent(input.token)}`;
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: input.email }],
      subject: "Your File Vault access invite",
      htmlContent: `
        <p>You have been invited to File Vault.</p>
        <p>Use this secure link to set your password:</p>
        <p><a href="${setupUrl}">${setupUrl}</a></p>
        <p>This invite expires in 7 days.</p>
      `,
      textContent: `You have been invited to File Vault. Set your password here: ${setupUrl}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo email failed with status ${response.status}.`);
  }
}
