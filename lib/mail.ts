
import nodemailer from 'nodemailer';

interface Apprentice {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Configure SMTP transporter using Environment Variables for reliability.
 * Users should set SMTP_USER and SMTP_PASS (Gmail App Password).
 */
function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("SMTP_USER or SMTP_PASS not set in environment variables. Falling back to console log.");
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
}

/**
 * Sends a personalized email to an apprentice with a secure link to their TSF.
 * 
 * @param apprenti Apprentice object containing firstName, lastName, and email
 * @param token Secure MagicToken for the link
 */
export async function sendEmailToApprenti(apprenti: Apprentice, token: string) {
  if (!apprenti.email) {
    console.warn(`Attempted to send email to ${apprenti.firstName} ${apprenti.lastName} but email is missing.`);
    return { success: false, error: 'Email missing' };
  }

  const transporter = getTransporter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2222';
  const secureLink = `${appUrl}/apprentis/${token}`;

  const subject = `🚀 Votre parcours de formation est prêt ! (Livret TSF)`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; border-radius: 20px; color: white; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Bonjour ${apprenti.firstName} ! 👋</h1>
        <p style="margin-top: 10px; font-size: 16px; opacity: 0.9;">Votre centre de formation a initialisé votre parcours pédagogique.</p>
      </div>
      
      <p>Votre <strong>Tableau de Stratégie de Formation (TSF)</strong> est désormais accessible en ligne. Vous pouvez consulter vos périodes de stage et les compétences à acquérir.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
        <p style="margin-top: 0; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Lien d'accès sécurisé</p>
        <a href="${secureLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);">
          👉 Ouvrir mon livret en ligne
        </a>
        <p style="margin-bottom: 0; margin-top: 20px; font-size: 13px; color: #ef4444; font-weight: 500;">
          ⚠️ Ce lien est personnel et expirera dans 14 jours.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        Si vous n'arrivez pas à cliquer sur le bouton, copiez-collez ce lien dans votre navigateur :<br>
        <span style="color: #4f46e5; font-size: 12px; word-break: break-all;">${secureLink}</span>
      </p>
      
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        Cet email a été envoyé automatiquement par Alternance 360 pour votre centre de formation.
      </p>
    </div>
  `;

  if (!transporter) {
    console.log(`[DEV MODE - NO SMTP] Email conceptually sent to: ${apprenti.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link: ${secureLink}`);
    return { success: true, mode: 'dev_log' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Alternance 360" <${process.env.SMTP_USER}>`,
      to: apprenti.email,
      subject: subject,
      html: html,
    });

    console.log(`Email successfully sent to ${apprenti.email}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`Failed to send email to ${apprenti.email}:`, error.message);
    return { success: false, error: error.message };
  }
}
/**
 * Sends a notification email to a tutor when an apprentice submits their auto-evaluation.
 * 
 * @param tutor Tutor object containing firstName and email
 * @param apprenticeName Name of the apprentice who submitted
 * @param token Secure MagicToken for the tutor linkage
 */
export async function sendEmailToTutor(tutor: { firstName: string, email: string }, apprenticeName: string, token: string) {
  if (!tutor.email) return { success: false, error: 'Email missing' };

  const transporter = getTransporter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:2222';
  const secureLink = `${appUrl}/tutor/access/${token}`;

  const subject = `🎯 Auto-évaluation soumise par ${apprenticeName}`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; line-height: 1.6;">
      <div style="background: #0f172a; padding: 30px; border-radius: 20px; color: white; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Bonjour ${tutor.firstName} !</h1>
        <p style="margin-top: 10px; font-size: 16px; opacity: 0.9;">${apprenticeName} vient de soumettre son auto-évaluation.</p>
      </div>
      
      <p>L'apprenti a complété ses auto-évaluations pour la période en cours. Vous pouvez maintenant consulter ses réponses et valider ses compétences.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
        <a href="${secureLink}" style="display: inline-block; background-color: #0f172a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
          👉 Consulter et valider
        </a>
      </div>
      
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px;">
        Alternance 360 - Plateforme de suivi pédagogique
      </p>
    </div>
  `;

  if (!transporter) {
    console.log(`[DEV MODE] Email to Tutor: ${tutor.email}, Link: ${secureLink}`);
    return { success: true, mode: 'dev_log' };
  }

  try {
    await transporter.sendMail({
      from: `"Alternance 360" <${process.env.SMTP_USER}>`,
      to: tutor.email,
      subject: subject,
      html: html,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
