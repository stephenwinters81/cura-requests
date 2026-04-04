import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePDF } from "@/lib/pdf";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const GenerateSchema = z.object({
  requestId: z.string().min(1, "requestId is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = GenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { requestId } = parsed.data;

    const pdfBuffer = await generatePDF(requestId);

    await logAudit(null, "pdf_generated", "imaging_request", requestId);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="request-${requestId}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    const message =
      error instanceof Error ? error.message : "PDF generation failed";

    if (message.includes("not found") || message.includes("No ImagingRequest")) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
