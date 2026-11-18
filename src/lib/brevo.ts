export function isBrevoConfigured(): boolean {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SENDER_EMAIL;
  return Boolean(
    apiKey &&
      sender &&
      !apiKey.includes('your-brevo-api-key') &&
      apiKey.length > 12
  );
}

export interface SendDeliveryEmailParams {
  toEmail: string;
  toName: string;
  brandName: string;
  packName: string;
  deliveryLink: string;
  creationsCount: number;
}

export async function sendBrevoDeliveryEmail(
  params: SendDeliveryEmailParams
): Promise<{ sent: boolean; simulated: boolean; messageId?: string }> {
  const {
    toEmail,
    toName,
    brandName,
    packName,
    deliveryLink,
    creationsCount,
  } = params;

  if (!isBrevoConfigured()) {
    return {
      sent: true,
      simulated: true,
      messageId: `sim_brevo_${Date.now()}`,
    };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'contact@studio-h.eu';
  const apiKey = process.env.BREVO_API_KEY!;

  const htmlContent = `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background-color: #1E2E01; color: #FFF8B9; padding: 40px 28px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255, 248, 185, 0.2);">
      <div style="border-bottom: 1px solid rgba(255, 248, 185, 0.15); padding-bottom: 20px; margin-bottom: 28px;">
        <span style="display: inline-block; background-color: #568203; color: #FFF8B9; padding: 6px 12px; border-radius: 6px; font-weight: 700; letter-spacing: 0.08em; font-size: 13px;">STUDIO H</span>
        <h1 style="margin: 16px 0 4px 0; font-size: 22px; color: #FFF8B9; font-weight: 600;">Livraison de vos créations publicitaires IA & UGC</h1>
        <p style="margin: 0; color: rgba(255, 248, 185, 0.75); font-size: 14px;">Marque : ${brandName} — Pack : ${packName}</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6; color: #FFF8B9;">Bonjour ${toName || brandName},</p>
      <p style="font-size: 15px; line-height: 1.6; color: rgba(255, 248, 185, 0.88);">
        La production de votre pack <strong>${packName}</strong> (${creationsCount} création${creationsCount > 1 ? 's' : ''} contrôlée${creationsCount > 1 ? 's' : ''} et validée${creationsCount > 1 ? 's' : ''}) est désormais terminée.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: rgba(255, 248, 185, 0.88);">
        Vous pouvez visionner et télécharger l'ensemble de vos fichiers haute définition directement via votre dossier sécurisé ci-dessous :
      </p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${deliveryLink}" style="background-color: #568203; color: #FFF8B9; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; border: 1px solid rgba(255, 248, 185, 0.35); display: inline-block;">
          Accéder aux fichiers livrés
        </a>
      </div>
      <p style="font-size: 13px; color: rgba(255, 248, 185, 0.6); margin-top: 32px; border-top: 1px solid rgba(255, 248, 185, 0.12); padding-top: 16px;">
        Studio H — Direction Créative Publicitaire & Production UGC IA Europe
      </p>
    </div>
  `;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Studio H',
        email: senderEmail,
      },
      to: [
        {
          email: toEmail,
          name: toName || brandName,
        },
      ],
      subject: `Studio H — Livraison de votre pack ${packName} (${brandName})`,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API Brevo (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { messageId?: string };
  return {
    sent: true,
    simulated: false,
    messageId: data.messageId,
  };
}

