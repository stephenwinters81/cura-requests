import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// --- Interfaces ---

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface RequestEmailData {
  patientName: string;
  examType: string;
  providerName: string;
  practiceName: string;
}

// --- Lazy-init transporter ---

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS
      connectionTimeout: 30_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

// --- Send to radiology practice ---

export async function sendProviderEmail(
  to: string,
  pdfBuffer: Buffer,
  requestData: RequestEmailData
): Promise<EmailResult> {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: `New imaging booking - ${requestData.patientName}`,
      text: [
        `Please find attached an imaging request form for ${requestData.patientName}.`,
        "",
        `Exam: ${requestData.examType}`,
        `Referring Doctor: ${requestData.providerName}`,
        `Practice: ${requestData.practiceName}`,
        "",
        "This is an automated message from CURA Medical Specialists.",
      ].join("\n"),
      attachments: [
        {
          filename: "imaging-request.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

// --- Send filing copy to self ---

export async function sendFilingEmail(
  recipient: string,
  pdfBuffer: Buffer,
  requestData: RequestEmailData
): Promise<EmailResult> {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject: `Please file this request form - ${requestData.patientName} - ${requestData.examType}`,
      text: [
        `Filing copy for ${requestData.patientName}.`,
        "",
        `Exam: ${requestData.examType}`,
        `Referring Doctor: ${requestData.providerName}`,
        `Practice: ${requestData.practiceName}`,
        "",
        "Please file this document in the patient record.",
      ].join("\n"),
      attachments: [
        {
          filename: "imaging-request.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

// --- SMTP health check ---

export async function verifySMTP(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "SMTP verify failed" };
  }
}

// --- Send admin alert email ---

export async function sendAlertEmail(subject: string, body: string): Promise<void> {
  const to = process.env.ALERT_EMAIL;
  if (!to) return;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: `[CURA Alert] ${subject}`,
      text: body,
    });
  } catch (error) {
    console.error("Failed to send alert email:", error instanceof Error ? error.message : error);
  }
}

// --- Send welcome/invitation email to new user ---

export async function sendWelcomeEmail(
  to: string,
  userName: string,
  tempPassword: string
): Promise<EmailResult> {
  const appUrl = process.env.NEXTAUTH_URL || "https://requests.cura";
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: "Welcome to CURA Requests — Your Account",
      text: [
        `Hi ${userName},`,
        "",
        "An account has been created for you on CURA Requests, our imaging request management system.",
        "",
        "Your temporary login credentials:",
        "",
        `  Email:    ${to}`,
        `  Password: ${tempPassword}`,
        "",
        `Sign in at: ${appUrl}`,
        "",
        "On first login you will be guided through a short setup process:",
        "  1. Change your password",
        "  2. Set up two-factor authentication (MFA)",
        "  3. Add your provider number(s)",
        "  4. Upload your signature",
        "",
        "Please complete this setup promptly and do not share your credentials.",
        "",
        "If you have any questions, contact your administrator.",
        "",
        "Kind regards,",
        "CURA Medical Specialists",
      ].join("\n"),
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

// --- Send copy to patient ---

export async function sendPatientEmail(
  to: string,
  pdfBuffer: Buffer,
  requestData: RequestEmailData
): Promise<EmailResult> {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: "Your imaging request form",
      text: [
        `Dear ${requestData.patientName},`,
        "",
        "Please find attached a copy of your imaging request form for your records.",
        "",
        `Exam: ${requestData.examType}`,
        `Practice: ${requestData.practiceName}`,
        `Referring Doctor: ${requestData.providerName}`,
        "",
        "Please bring this form to your imaging appointment.",
        "",
        "Kind regards,",
        "CURA Medical Specialists",
      ].join("\n"),
      attachments: [
        {
          filename: "imaging-request.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}
