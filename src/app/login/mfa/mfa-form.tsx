"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

export function MfaForm() {
  const router = useRouter();
  const { data: session } = useSession();

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submitCode = useCallback(
    async (code: string) => {
      if (!session?.user?.email) return;

      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/auth/mfa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session.user.email,
            code,
            rememberDevice,
          }),
        });

        if (!res.ok) {
          setError("Invalid verification code. Please try again.");
          setDigits(["", "", "", "", "", ""]);
          setLoading(false);
          setTimeout(() => inputRefs.current[0]?.focus(), 50);
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("An unexpected error occurred. Please try again.");
        setLoading(false);
      }
    },
    [session?.user?.email, router, rememberDevice]
  );

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const code = newDigits.join("");
      if (code.length === 6) {
        submitCode(code);
      }
    } else if (digit) {
      const code = newDigits.join("");
      if (code.length === 6 && !code.includes("")) {
        submitCode(code);
      }
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
        submitCode(code);
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
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white/95 leading-tight">
              Identity
              <br />
              Verification
            </h1>
            <div className="mt-4 h-px w-16 bg-gradient-to-r from-primary/60 to-transparent" />
          </div>

          <div>
            <p className="text-[15px] text-white/50 font-medium uppercase tracking-widest mb-3">
              Two-Factor Authentication
            </p>
            <p className="text-[15px] text-white/35 leading-relaxed max-w-[320px]">
              An additional layer of security protecting patient health information
              and clinical systems.
            </p>
          </div>
        </div>

        <div className="relative z-10 px-12 xl:px-16 pb-8">
          <p className="text-xs text-white/20">
            ACSC Essential Eight &middot; Mandatory MFA
          </p>
        </div>
      </div>

      {/* Right Panel: MFA Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Mobile branding */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-primary" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                CURA Medical
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Two-factor authentication
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* 6-digit Input */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
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
                disabled={loading}
                className="w-12 h-14 text-center text-xl font-mono font-semibold rounded-lg border border-input bg-background shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/50 disabled:opacity-50"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {/* Remember device checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-8 justify-center">
            <Checkbox
              checked={rememberDevice}
              onCheckedChange={(checked) =>
                setRememberDevice(checked === true)
              }
              disabled={loading}
            />
            <span className="text-sm text-muted-foreground">
              Remember this device for 30 days
            </span>
          </label>

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Verifying...</span>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Open your authenticator app to view the verification code.
          </p>
        </div>
      </div>
    </div>
  );
}
