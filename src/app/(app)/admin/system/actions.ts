"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { queueDelivery, deliveryQueue } from "@/lib/queue";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function retryAllFailed(): Promise<{ success: boolean; retried: number; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, retried: 0, error: "Forbidden" };
  }

  const failedJobs = await prisma.deliveryJob.findMany({
    where: { status: "failed" },
    include: {
      request: {
        select: {
          id: true,
          pdfPath: true,
          practice: { select: { email: true, fax: true } },
          provider: { select: { email: true } },
        },
      },
    },
  });

  let retried = 0;

  for (const job of failedJobs) {
    if (!job.request.pdfPath) continue;

    // Use stored recipient if available, otherwise derive from request data
    let recipient = job.recipient;
    if (!recipient) {
      switch (job.type) {
        case "provider_email":
          recipient = job.request.practice?.email ?? "";
          break;
        case "provider_fax":
          recipient = job.request.practice?.fax ?? "";
          break;
        case "filing_email":
          recipient = job.request.provider.email ?? process.env.SMTP_FROM ?? "";
          break;
        case "patient_email":
          // patientEmail is encrypted at rest — cannot derive here.
          // If recipient wasn't stored on the job, skip it.
          recipient = "";
          break;
      }
    }
    if (!recipient) continue;

    // Reset the delivery job status
    await prisma.deliveryJob.update({
      where: { id: job.id },
      data: { status: "queued", lastError: null, attempts: 0 },
    });

    // Remove from BullMQ failed set before re-queuing
    try {
      await deliveryQueue.remove(job.id);
    } catch {
      // Job may not exist in BullMQ — that's fine
    }

    await queueDelivery(
      job.requestId,
      job.id,
      job.type as "provider_email" | "provider_fax" | "filing_email" | "patient_email",
      recipient,
      job.request.pdfPath
    );

    retried++;
  }

  await logAudit(
    session.user.id,
    "system_retry_all",
    undefined,
    undefined,
    `Retried ${retried} failed delivery jobs`
  );

  revalidatePath("/admin/system");
  return { success: true, retried };
}
