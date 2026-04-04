"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function MfaSetupPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [step, setStep] = useState<1 | 2>(1);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Generate MFA secret on mount
  useEffect(() => {
    async function setup() {
      setSetupLoading(true);
      try {
        const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
        if (!res.ok) {
          setSetupError("Failed to generate MFA setup. Please try again.");
          return;
        }
        const data = await res.json();
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setManualSecret(data.secret);
      } catch {
        setSetupError("Failed to generate MFA setup. Please try again.");
      } finally {
        setSetupLoading(false);
      }
    }
    setup();
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(manualSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const submitVerification = useCallback(
    async (code: string) => {
      if (!session?.user?.email) return;

      setVerifyLoading(true);
      setVerifyError("");

      try {
        // Verify and enable MFA
        const res = await fetch("/api/auth/mfa/setup", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json();
          setVerifyError(data.error || "Invalid code. Please try again.");
          setDigits(["", "", "", "", "", ""]);
          setVerifyLoading(false);
          setTimeout(() => inputRefs.current[0]?.focus(), 50);
          return;
        }

        // MFA is now enabled — sign out and redirect to login for fresh sign-in with MFA
        await signOut({ callbackUrl: "/login?mfaSetup=complete" });
      } catch {
        setVerifyError("An unexpected error occurred. Please try again.");
        setVerifyLoading(false);
      }
    },
    [session?.user?.email]
  );

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    const code = newDigits.join("");
    if (code.length === 6 && !newDigits.includes("")) {
      submitVerification(code);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);

    const nextEmpty = newDigits.findIndex((d) => !d);
    if (nextEmpty === -1) {
      inputRefs.current[5]?.focus();
      const code = newDigits.join("");
      if (code.length === 6) {
        submitVerification(code);
      }
    } else {
      inputRefs.current[nextEmpty]?.focus();
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel: Branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative flex-col justify-between overflow-hidden bg-gradient-to-br from-[oklch(0.22_0.03_200)] via-[oklch(0.18_0.04_190)] to-[oklch(0.14_0.03_210)]">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

        <div className="relative z-10 flex flex-col justify-center flex-1 px-12 xl:px-16">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-primary" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white/95 leading-tight">
              Security
              <br />
              Setup
            </h1>
            <div className="mt-4 h-px w-16 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>

          <div>
            <p className="text-[15px] text-white/50 font-medium uppercase tracking-widest mb-3">
              MFA Enrolment
            </p>
            <p className="text-[15px] text-white/35 leading-relaxed max-w-[320px]">
              Two-factor authentication is mandatory under ACSC Essential Eight
              guidelines for healthcare systems.
            </p>
          </div>

          {/* Step indicator */}
          <div className="mt-12 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${step === 1 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/40"}`}>
                1
              </div>
              <span className={`text-sm ${step === 1 ? "text-white/70" : "text-white/30"}`}>Scan</span>
            </div>
            <div className="w-8 h-px bg-white/15" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${step === 2 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/40"}`}>
                2
              </div>
              <span className={`text-sm ${step === 2 ? "text-white/70" : "text-white/30"}`}>Verify</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-12 xl:px-16 pb-8">
          <p className="text-xs text-white/20">
            Protected health information &middot; Authorised access only
          </p>
        </div>
      </div>

      {/* Right Panel: Setup Content */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 bg-background">
        <div className="w-full max-w-[440px]">
          {/* Mobile branding */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-primary" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                CURA Medical
              </span>
            </div>
          </div>

          {/* Step 1: Scan QR Code */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Set up authenticator
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Scan the QR code below with your authenticator app (Google
                  Authenticator, Authy, or similar).
                </p>
              </div>

              {setupError && (
                <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {setupError}
                </div>
              )}

              {setupLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg className="animate-spin h-6 w-6 text-primary mb-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">Generating setup...</p>
                </div>
              ) : (
                <>
                  {/* QR Code */}
                  {qrCodeDataUrl && (
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-white rounded-xl border shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrCodeDataUrl}
                          alt="MFA QR Code"
                          width={200}
                          height={200}
                          className="block"
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual key */}
                  {manualSecret && (
                    <div className="mb-8">
                      <p className="text-xs text-muted-foreground mb-2 text-center">
                        Or enter this key manually:
                      </p>
                      <div className="flex items-center gap-2 justify-center">
                        <code className="px-3 py-2 bg-muted rounded-lg text-sm font-mono tracking-wider select-all">
                          {manualSecret}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg border bg-background hover:bg-accent transition-colors"
                        >
                          {copied ? (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Continue button */}
                  <button
                    type="button"
                    onClick={() => {
                      setStep(2);
                      setTimeout(() => inputRefs.current[0]?.focus(), 50);
                    }}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    I&apos;ve scanned the code
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Verify setup
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the 6-digit code shown in your authenticator app to
                  confirm setup.
                </p>
              </div>

              {verifyError && (
                <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {verifyError}
                </div>
              )}

              {/* 6-digit Input */}
              <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={verifyLoading}
                    className="w-12 h-14 text-center text-xl font-mono font-semibold rounded-lg border border-input bg-background shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/50 disabled:opacity-50"
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>

              {verifyLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Verifying...</span>
                </div>
              )}

              {/* Back button */}
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={verifyLoading}
                className="flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Back to QR code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
