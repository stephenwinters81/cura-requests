import { NextRequest, NextResponse } from "next/server";
import { decryptPDFFromDisk } from "@/lib/pdf";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing request ID" },
        { status: 400 }
      );
    }

    const pdfBuffer = await decryptPDFFromDisk(id);

    await logAudit(null, "pdf_viewed", "imaging_request", id);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="request-${id}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PDF retrieval failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (
      message.includes("not found") ||
      message.includes("No ImagingRequest") ||
      message.includes("No PDF file found") ||
      message.includes("missing from disk")
    ) {
      return NextResponse.json(
        { error: "PDF not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to retrieve PDF" },
      { status: 500 }
    );
  }
}
