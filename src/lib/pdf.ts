import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/encryption";
import {
  ImagingRequestPDF,
  type PDFRequestProps,
  type PDFPatientProps,
  type PDFPracticeProps,
  type PDFProviderProps,
} from "@/components/pdf/ImagingRequestPDF";
import type { ParsedPhi } from "@/lib/types";

// --- Encryption helpers ---

function getPdfEncryptionKey(): Buffer {
  const hex = process.env.PDF_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PDF_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(hex, "hex");
}

function encryptBuffer(plainBuffer: Buffer): Buffer {
  const key = getPdfEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainBuffer),
    cipher.final(),
  ]);
  // Prepend IV to ciphertext
  return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(encBuffer: Buffer): Buffer {
  const key = getPdfEncryptionKey();
  const iv = encBuffer.subarray(0, 16);
  const ciphertext = encBuffer.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// --- Parse PHI into patient props ---

function buildPatientProps(
  parsedPhi: ParsedPhi | null,
  rawText: string
): PDFPatientProps {
  if (!parsedPhi) {
    return { rawText };
  }

  const patient: PDFPatientProps = {};

  if (parsedPhi.names && parsedPhi.names.length > 0) {
    patient.name = parsedPhi.names[0];
  }
  if (parsedPhi.dobs && parsedPhi.dobs.length > 0) {
    patient.dob = parsedPhi.dobs[0];
  }
  if (parsedPhi.medicareNumbers && parsedPhi.medicareNumbers.length > 0) {
    patient.medicare = parsedPhi.medicareNumbers[0];
  }
  if (parsedPhi.phones && parsedPhi.phones.length > 0) {
    patient.phone = parsedPhi.phones[0];
  }
  if (parsedPhi.addresses && parsedPhi.addresses.length > 0) {
    patient.address = parsedPhi.addresses[0];
  }

  // If no structured fields extracted, fall back to raw text
  const hasAny =
    patient.name ||
    patient.dob ||
    patient.medicare ||
    patient.phone ||
    patient.address;
  if (!hasAny) {
    patient.rawText = rawText;
  }

  return patient;
}

// --- Main generation ---

export async function generatePDF(requestId: string): Promise<Buffer> {
  // 1. Load request with relations
  const request = await prisma.imagingRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      practice: true,
      provider: true,
      reportByRadiologist: true,
      creator: { select: { signatureImage: true } },
    },
  });

  // 2. Decrypt PHI
  let rawText = "";
  try {
    rawText = await decryptField(request.rawPhiInput);
  } catch {
    // If decryption fails, rawPhiInput may be plaintext (dev mode)
    rawText = request.rawPhiInput;
  }

  let parsedPhi: ParsedPhi | null = null;
  if (request.parsedPhi) {
    try {
      // parsedPhi could be an encrypted string or raw JSON
      if (typeof request.parsedPhi === "string") {
        const decrypted = await decryptField(request.parsedPhi as string);
        parsedPhi = JSON.parse(decrypted) as ParsedPhi;
      } else {
        // Already a JSON object from Prisma
        parsedPhi = request.parsedPhi as unknown as ParsedPhi;
      }
    } catch {
      // Parsing failed - fall back to raw text
      parsedPhi = null;
    }
  }

  // 3. Build props
  const patient = buildPatientProps(parsedPhi, rawText);

  const practice: PDFPracticeProps = request.practice
    ? {
        name: request.practice.name,
        address: request.practice.address ?? undefined,
        phone: request.practice.phone ?? undefined,
        fax: request.practice.fax ?? undefined,
        email: request.practice.email ?? undefined,
      }
    : { name: "Unknown Practice" };

  // 4. Check signature file (user-level, same across all provider numbers)
  let signaturePath: string | undefined;
  let signatureExists = false;
  if (request.creator.signatureImage) {
    signaturePath = path.join(process.cwd(), "data", request.creator.signatureImage);
    signatureExists = fs.existsSync(signaturePath);
  }

  const provider: PDFProviderProps = {
    doctorName: request.provider.doctorName,
    providerNumber: request.provider.providerNumber,
    location: request.provider.location,
    address: request.provider.address ?? undefined,
    phone: request.provider.phone ?? undefined,
    fax: request.provider.fax ?? undefined,
    email: request.provider.email ?? undefined,
    signatureImagePath: signatureExists ? signaturePath : undefined,
  };

  const pdfRequest: PDFRequestProps = {
    id: request.id,
    examType: request.examType,
    examOther: request.examOther ?? undefined,
    clinicalDetails: await decryptField(request.clinicalDetails).catch(() => request.clinicalDetails),
    contrastReaction: request.contrastReaction,
    egfr: request.egfr ?? undefined,
    reportByRadiologist: request.reportByRadiologist?.name,
    createdAt: request.createdAt,
  };

  // 5. Render PDF to buffer
  const pdfBuffer = await renderToBuffer(
    createElement(ImagingRequestPDF, {
      request: pdfRequest,
      patient,
      practice,
      provider,
    }) as any
  );

  const buffer = Buffer.from(pdfBuffer);

  // 6. Encrypt and write to disk
  const storagePath =
    process.env.PDF_STORAGE_PATH ||
    path.join(process.cwd(), "storage", "pdfs");
  fs.mkdirSync(storagePath, { recursive: true });

  const encryptedBuffer = encryptBuffer(buffer);
  const filePath = path.join(storagePath, `${requestId}.pdf.enc`);
  fs.writeFileSync(filePath, encryptedBuffer);

  // 7. Update DB with PDF path
  await prisma.imagingRequest.update({
    where: { id: requestId },
    data: { pdfPath: filePath },
  });

  // 8. Return unencrypted buffer
  return buffer;
}

// --- Decrypt from disk ---

export async function decryptPDFFromDisk(
  requestId: string
): Promise<Buffer> {
  const request = await prisma.imagingRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { pdfPath: true },
  });

  if (!request.pdfPath) {
    throw new Error(`No PDF file found for request ${requestId}`);
  }

  if (!fs.existsSync(request.pdfPath)) {
    throw new Error(`PDF file missing from disk: ${request.pdfPath}`);
  }

  const encryptedData = fs.readFileSync(request.pdfPath);
  return decryptBuffer(encryptedData);
}
