import { prisma } from "@/lib/db";
import { generatePDF } from "@/lib/pdf";
import { decryptField } from "@/lib/encryption";
import { queueDelivery } from "@/lib/queue";
import type {
  OrchestrationResult,
  DeliveryJobType,
  DeliveryMethod,
} from "@/lib/types";

interface JobDescriptor {
  type: DeliveryJobType;
  recipient: string;
}

/**
 * Orchestrate the full submission pipeline for an imaging request:
 * 1. Generate PDF (encrypts to disk + updates pdfPath)
 * 2. Determine delivery targets based on practice config and request options
 * 3. Create DeliveryJob records in a transaction
 * 4. Enqueue all jobs to BullMQ
 */
export async function orchestrateSubmission(
  requestId: string
): Promise<OrchestrationResult> {
  // 1. Load request with practice + provider
  const request = await prisma.imagingRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      practice: true,
      provider: true,
    },
  });

  // 2. Generate PDF — writes encrypted file to disk, updates pdfPath, returns buffer
  await generatePDF(requestId);

  // 3. Reload to get the updated pdfPath
  const updated = await prisma.imagingRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { pdfPath: true },
  });

  if (!updated.pdfPath) {
    throw new Error(`PDF generation did not produce a file path for request ${requestId}`);
  }

  const pdfPath = updated.pdfPath;
  const deliveryMethod = request.deliveryMethod as DeliveryMethod;

  // 4. Build job descriptors
  const jobs: JobDescriptor[] = [];

  // Provider delivery — email first, fax only as fallback if email fails
  if (request.practice) {
    const hasEmail = !!request.practice.email;
    const hasFax = !!request.practice.fax;

    if (hasEmail) {
      // Email is the primary delivery method
      jobs.push({
        type: "provider_email",
        recipient: request.practice.email!,
      });
    } else if (hasFax) {
      // No email available — fax is the only option
      jobs.push({
        type: "provider_fax",
        recipient: request.practice.fax!,
      });
    }
    // If practice has both, fax fallback is triggered by the worker
    // when email fails after all retries (see delivery-worker.ts)
  }

  // Clinic filing email — sent to the provider's clinic email so they can file in their system
  if (request.provider.email) {
    jobs.push({
      type: "filing_email",
      recipient: request.provider.email,
    });
  }

  // Patient email — only if opted in and email provided (decrypt since it's encrypted at rest)
  if (request.sendToPatient && request.patientEmail) {
    const decryptedPatientEmail = await decryptField(request.patientEmail);
    jobs.push({
      type: "patient_email",
      recipient: decryptedPatientEmail,
    });
  }

  // 5. Create DeliveryJob records in a transaction
  const deliveryJobs = await prisma.$transaction(
    jobs.map((job) =>
      prisma.deliveryJob.create({
        data: {
          requestId,
          type: job.type,
          recipient: job.recipient,
          status: "queued",
          attempts: 0,
        },
      })
    )
  );

  // 6. Enqueue all jobs to BullMQ
  await Promise.all(
    deliveryJobs.map((dbJob, index) =>
      queueDelivery(
        requestId,
        dbJob.id,
        jobs[index].type,
        jobs[index].recipient,
        pdfPath
      )
    )
  );

  // 7. Return result
  return {
    requestId,
    jobIds: deliveryJobs.map((j) => j.id),
    deliveryMethod,
  };
}
