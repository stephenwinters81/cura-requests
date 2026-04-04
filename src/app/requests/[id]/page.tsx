import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptField, decryptJson } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge, ResendButton, ViewPdfButton, PrintButton } from "./components";
import type { ParsedPhi } from "@/lib/types";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Australia/Sydney",
  }).format(date);
}

function formatJobType(type: string): string {
  const labels: Record<string, string> = {
    provider_email: "Provider Email",
    provider_fax: "Provider Fax",
    filing_email: "Filing Email",
    patient_email: "Patient Email",
  };
  return labels[type] || type;
}

interface InfoRowProps {
  label: string;
  value: string | null | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <span className="text-sm text-foreground text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  // 2. Load request with all relations
  const request = await prisma.imagingRequest.findUnique({
    where: { id },
    include: {
      practice: true,
      provider: true,
      reportByRadiologist: true,
      deliveryJobs: {
        orderBy: { createdAt: "asc" },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!request) {
    notFound();
  }

  // 3. Authorization: staff sees own, admin sees all
  const isOwner = request.createdBy === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    notFound();
  }

  // 4. Decrypt PHI for display
  let rawPhiText = "";
  try {
    rawPhiText = await decryptField(request.rawPhiInput);
  } catch {
    rawPhiText = request.rawPhiInput;
  }

  let parsedPhi: ParsedPhi | null = null;
  if (request.parsedPhi) {
    try {
      if (typeof request.parsedPhi === "string") {
        parsedPhi = await decryptJson<ParsedPhi>(request.parsedPhi as string);
      } else {
        parsedPhi = request.parsedPhi as unknown as ParsedPhi;
      }
    } catch {
      parsedPhi = null;
    }
  }

  // Decrypt clinical details and patient email
  let clinicalDetails = request.clinicalDetails;
  try {
    clinicalDetails = await decryptField(request.clinicalDetails);
  } catch {
    // fallback to raw value
  }

  let patientEmail = request.patientEmail;
  if (patientEmail) {
    try {
      patientEmail = await decryptField(patientEmail);
    } catch {
      // fallback to raw value
    }
  }

  // 5. Audit log the view
  await logAudit(
    session.user.id,
    "request_viewed",
    "imaging_request",
    request.id
  );

  // Determine if structured PHI is available
  const hasStructuredPhi =
    parsedPhi &&
    (parsedPhi.names?.length > 0 ||
      parsedPhi.dobs?.length > 0 ||
      parsedPhi.medicareNumbers?.length > 0 ||
      parsedPhi.phones?.length > 0 ||
      parsedPhi.addresses?.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* --- Header --- */}
        <div className="mb-8">
          <Link
            href="/requests"
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Requests
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Request Detail
                </h1>
                <StatusBadge status={request.status} />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                  {request.id}
                </code>
                <span className="text-border">|</span>
                <span>{formatDate(request.createdAt)}</span>
                <span className="text-border">|</span>
                <span>by {request.creator.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {request.pdfPath && <ViewPdfButton requestId={request.id} />}
              <PrintButton />
            </div>
          </div>
        </div>

        {/* --- Info Cards Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Patient Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasStructuredPhi ? (
                <div className="space-y-0">
                  <InfoRow label="Name" value={parsedPhi!.names?.[0]} />
                  <InfoRow label="Date of Birth" value={parsedPhi!.dobs?.[0]} />
                  <InfoRow label="Medicare" value={parsedPhi!.medicareNumbers?.[0]} />
                  <InfoRow label="Phone" value={parsedPhi!.phones?.[0]} />
                  {parsedPhi!.emails?.length > 0 && (
                    <InfoRow label="Email" value={parsedPhi!.emails[0]} />
                  )}
                  <InfoRow label="Address" value={parsedPhi!.addresses?.[0]} />
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                    Raw Patient Input
                  </p>
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {rawPhiText}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exam Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <InfoRow label="Exam Type" value={request.examType} />
                {request.examOther && (
                  <InfoRow label="Other Details" value={request.examOther} />
                )}
                <InfoRow label="Clinical Details" value={clinicalDetails} />
                <InfoRow
                  label="Contrast Reaction"
                  value={request.contrastReaction === "yes" ? "Yes" : "No"}
                />
                <InfoRow label="eGFR" value={request.egfr} />
                {request.reportByRadiologist && (
                  <InfoRow
                    label="Preferred Radiologist"
                    value={request.reportByRadiologist.name}
                  />
                )}
                <InfoRow
                  label="Delivery Method"
                  value={request.deliveryMethod.charAt(0).toUpperCase() + request.deliveryMethod.slice(1)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Practice */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.practice ? (
                <div className="space-y-0">
                  <InfoRow label="Name" value={request.practice.name} />
                  <InfoRow label="Address" value={request.practice.address} />
                  <InfoRow label="Phone" value={request.practice.phone} />
                  <InfoRow label="Fax" value={request.practice.fax} />
                  <InfoRow label="Email" value={request.practice.email} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No practice linked (manual entry)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Provider */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Referring Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <InfoRow label="Doctor" value={request.provider.doctorName} />
                <InfoRow label="Provider Number" value={request.provider.providerNumber} />
                <InfoRow label="Location" value={request.provider.location} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- Delivery Timeline --- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Delivery Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {request.deliveryJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No delivery jobs created yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead>Last Error</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Confirmed</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.deliveryJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium text-sm">
                        {formatJobType(job.type)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {job.attempts}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {job.lastError ? (
                          <span className="text-xs text-destructive truncate block" title={job.lastError}>
                            {job.lastError}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(job.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {job.confirmedAt ? formatDate(job.confirmedAt) : "--"}
                      </TableCell>
                      <TableCell className="text-right">
                        {job.status === "failed" && (
                          <ResendButton jobId={job.id} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* --- Footer Actions --- */}
        <div className="mt-8 flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/requests">Back to Requests</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
