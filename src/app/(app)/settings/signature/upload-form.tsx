"use client";

import { useState, useRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { uploadSignature, removeSignature } from "./actions";

interface Props {
  currentSignature: string | null;
}

export function SignatureUploadForm({ currentSignature }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [preview, setPreview] = useState<string | null>(
    currentSignature ? `/api/signature?t=${Date.now()}` : null
  );
  const sigRef = useRef<SignatureCanvas | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const clearPad = useCallback(() => {
    sigRef.current?.clear();
  }, []);

  async function handleDrawSave() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("Please draw your signature first");
      return;
    }

    setError(null);
    setSuccess(false);
    setUploading(true);

    try {
      // Get trimmed canvas as PNG blob
      const trimmed = sigRef.current.getTrimmedCanvas();
      const blob = await new Promise<Blob>((resolve, reject) => {
        trimmed.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to export"))),
          "image/png"
        );
      });

      const formData = new FormData();
      formData.append("signature", new File([blob], "signature.png", { type: "image/png" }));

      const result = await uploadSignature(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setPreview(trimmed.toDataURL("image/png"));
        sigRef.current?.clear();
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleFileUpload(formData: FormData) {
    setError(null);
    setSuccess(false);
    setUploading(true);

    try {
      const result = await uploadSignature(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        const file = formData.get("signature") as File;
        if (file) setPreview(URL.createObjectURL(file));
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      const result = await removeSignature();
      if (result.success) {
        setPreview(null);
        sigRef.current?.clear();
        if (fileRef.current) fileRef.current.value = "";
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Current signature preview */}
      {preview && (
        <div className="rounded-md border bg-white p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Current signature
          </p>
          <img
            src={preview}
            alt="Signature"
            className="max-h-[80px] max-w-[300px] object-contain"
          />
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("draw")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1.5"
          >
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
          Draw
        </Button>
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("upload")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1.5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Image
        </Button>
      </div>

      {/* Draw mode */}
      {mode === "draw" && (
        <div className="space-y-3">
          <div className="rounded-md border-2 border-dashed border-input bg-white touch-none">
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{
                className: "w-full",
                style: { width: "100%", height: "160px" },
              }}
              penColor="#1a365d"
              minWidth={1}
              maxWidth={2.5}
              dotSize={1.5}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Draw your signature above using your finger, stylus, or mouse.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={handleDrawSave} disabled={uploading}>
              {uploading ? "Saving..." : "Save Signature"}
            </Button>
            <Button type="button" variant="outline" onClick={clearPad}>
              Clear
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={handleRemove}
                disabled={uploading}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <form action={handleFileUpload} className="space-y-3">
          <div>
            <input
              ref={fileRef}
              type="file"
              name="signature"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPEG, or WebP. Max 2MB. Transparent background recommended.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Signature"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={handleRemove}
                disabled={uploading}
              >
                Remove
              </Button>
            )}
          </div>
        </form>
      )}

      {/* Feedback */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
          <p className="text-sm text-green-700">
            Signature saved successfully.
          </p>
        </div>
      )}
    </div>
  );
}
