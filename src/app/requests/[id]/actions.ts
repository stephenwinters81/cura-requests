"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queueDelivery } from "@/lib/queue";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function resendDeliveryJob(jobId: string): Promise<void> {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // 2. Load DeliveryJob with request + practice
  const job = await prisma.deliveryJob.findUnique({
    where: { id: jobId },
    include: {
      request: {
        include: {
          practice: true,
        },
      },
    },
  });

  if (!job) {
    throw new Error("Delivery job not found");
  }

  // 3. Verify ownership or admin
  const isOwner = job.request.createdBy === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized");
  }

  // 4. Verify status is failed
  if (job.status !== "failed") {
    throw new Error("Only failed jobs can be resent");
  }

  // 5. Verify PDF path exists
  if (!job.request.pdfPath) {
    throw new Error("No PDF available for this request");
  }

  // 6. Derive recipient from job type + practice/request data
  let recipient: string;

  switch (job.type) {
    case "provider_email":
      recipient = job.request.practice?.email ?? "";
      break;
    case "provider_fax":
      recipient = job.request.practice?.fax ?? "";
      break;
    case "filing_email":
      recipient = process.env.SMTP_FROM || process.env.SMTP_USER || "filing@curamedical.com.au";
      break;
    case "patient_email":
      recipient = job.request.patientEmail ?? "";
      break;
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }

  if (!recipient) {
    throw new Error("Cannot determine recipient for this delivery job");
  }

  // 7. Reset to queued, clear lastError
  await prisma.deliveryJob.update({
    where: { id: jobId },
    data: {
      status: "queued",
      lastError: null,
      attempts: 0,
    },
  });

  // 8. Enqueue to BullMQ
  await queueDelivery(
    job.requestId,
    jobId,
    job.type as "provider_email" | "provider_fax" | "filing_email" | "patient_email",
    recipient,
    job.request.pdfPath
  );

  // 9. Audit log
  await logAudit(
    session.user.id,
    "request_resent",
    "imaging_request",
    job.requestId,
    `Resent delivery job ${jobId} (${job.type})`
  );

  // 10. Revalidate the request detail page
  revalidatePath(`/requests/${job.requestId}`);
}
