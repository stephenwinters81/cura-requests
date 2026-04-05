import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding Guide | CURA Requests",
};

const slides = [
  {
    type: "title" as const,
  },
  {
    type: "text-only" as const,
    label: "Overview",
    title: "What is CURA Requests?",
    description:
      "A purpose-built system for submitting radiology imaging requests from any location you work at \u2014 CURA, hospital clinics, or private rooms. You fill in a form, we generate a professional PDF branded to that location, and it\u2019s delivered automatically to the radiology practice via email (with fax fallback).",
    features: [
      {
        icon: "\u26A1",
        color: "teal",
        title: "Fast Submission",
        desc: "Select a practice, paste patient details, choose the exam type, and submit from any of your locations. Typically under 60 seconds.",
      },
      {
        icon: "\uD83D\uDD12",
        color: "navy",
        title: "End-to-End Encryption",
        desc: "All patient health information is encrypted at rest using field-level encryption. PDFs are encrypted on disk.",
      },
      {
        icon: "\uD83D\uDCE8",
        color: "amber",
        title: "Automatic Delivery",
        desc: "Requests are emailed to the practice, your clinic for filing, and optionally to the patient. Fax fallback if email fails.",
      },
      {
        icon: "\uD83D\uDCCB",
        color: "red",
        title: "Full Audit Trail",
        desc: "Every action is logged \u2014 submissions, deliveries, logins. Complete traceability for compliance.",
      },
    ],
  },
  {
    type: "content" as const,
    label: "Step 1",
    title: "Logging In",
    description:
      "Access the system at your practice\u2019s URL. Enter your email and password to sign in.",
    bullets: [
      "Your account will be created by an administrator with a temporary password",
      "Two-factor authentication (MFA) is mandatory for all accounts",
      "After entering your password, you\u2019ll be prompted for a 6-digit code from your authenticator app",
      'Tick <strong>"Remember this device"</strong> to skip MFA on your computer for 30 days',
    ],
    image: "/slides/slide-login.png",
    imageAlt: "Login page",
  },
  {
    type: "content-reverse" as const,
    label: "Step 2",
    title: "First-Time MFA Setup",
    description:
      "On your first login, you\u2019ll be guided through setting up two-factor authentication.",
    bullets: [
      "Download <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app on your phone",
      "Scan the QR code shown on screen (or enter the secret key manually)",
      "Enter the 6-digit code from the app to verify the setup",
      "This is a one-time setup \u2014 after this, just enter the code when logging in",
    ],
    image: "mfa-illustration",
    imageAlt: "MFA setup",
  },
  {
    type: "content" as const,
    label: "Step 3",
    title: "Your Dashboard",
    description:
      "After logging in, you\u2019ll see your dashboard with a summary of your imaging requests.",
    bullets: [
      "<strong>This Week</strong> \u2014 number of requests submitted in the past 7 days",
      "<strong>Pending</strong> \u2014 requests awaiting delivery to the practice",
      "<strong>Failed</strong> \u2014 deliveries that need your attention (can be resent)",
      "The <strong>Recent Requests</strong> table shows your latest submissions with status",
      'Click <strong>"+ New Imaging Request"</strong> to get started',
    ],
    image: "/slides/slide-dashboard.png",
    imageAlt: "Dashboard",
  },
  {
    type: "content-reverse" as const,
    label: "Step 4 \u2014 Where to Send",
    title: "Select the Radiology Practice",
    description:
      "The first step is choosing which radiology practice will receive your imaging request.",
    bullets: [
      "Search from <strong>100+ pre-loaded radiology practices</strong> \u2014 type to filter by name (e.g. \u201CLumus\u201D, \u201CI-MED\u201D, \u201CCastlereagh\u201D)",
      "Practices you use frequently appear higher in the list, sorted by <strong>recent usage</strong>",
      "Once selected, the practice\u2019s <strong>address, fax, and email</strong> are shown for confirmation",
      "If the practice isn\u2019t listed, toggle <strong>Manual Mode</strong> to enter the details directly \u2014 this creates a new practice record for future use",
    ],
    image: "/slides/form-where-to-send-with-radiologist.png",
    imageAlt: "Where to send section with practice selected",
  },
  {
    type: "content" as const,
    label: "Step 4 \u2014 Preferred Radiologist",
    title: "Choose a Preferred Reporting Radiologist",
    description:
      "When a selected practice has neuroradiologists linked to it, you can nominate who you\u2019d like to report the study.",
    bullets: [
      "A <strong>\u201CPreferred reporting radiologist\u201D</strong> dropdown appears automatically when the selected practice has linked radiologists",
      "23 preferred neuroradiologists are pre-configured across the major practice groups",
      "Selecting a radiologist places their name in a <strong>red-bordered highlight box</strong> in the \u201CTo\u201D section of the PDF \u2014 making it immediately visible to the practice",
      "This is <strong>optional</strong> \u2014 leave it as \u201CNo preference\u201D if you don\u2019t have one",
      "Radiologists are managed by the admin via <strong>Administration \u2192 Radiologists</strong> and linked to specific practices",
    ],
    image: "/slides/form-practice-radiologist-example.svg",
    imageAlt: "I-MED Radiology selected showing preferred radiologist dropdown with neuroradiologists",
  },
  {
    type: "content" as const,
    label: "Step 4 \u2014 Patient Information",
    title: "Paste Patient Details",
    description:
      "Enter the patient\u2019s information as free text. The system parses it automatically.",
    bullets: [
      "<strong>Paste directly</strong> from your clinical system \u2014 no need to fill in separate fields",
      "The parser automatically extracts: <strong>full name</strong>, <strong>date of birth</strong> (multiple formats supported), <strong>Medicare number</strong>, <strong>phone</strong> (mobile + landline), <strong>email</strong>, and <strong>address</strong>",
      "Extracted fields appear structured on the PDF \u2014 if parsing fails, the raw text is used as a fallback",
      "All patient data is <strong>encrypted at field level</strong> before being stored in the database",
    ],
    image: "/slides/form-patient-info.png",
    imageAlt: "Patient information section",
  },
  {
    type: "content-reverse" as const,
    label: "Step 4 \u2014 Request Details",
    title: "Exam Type & Clinical Details",
    description:
      "Specify the imaging exam, provide clinical context, and flag any contrast-related risks.",
    bullets: [
      "<strong>Exam type</strong> \u2014 choose from 27 common imaging exams (CT Head, MRI Brain, X-Ray Chest, etc.) or select \u201COther\u201D and type a custom exam",
      "<strong>Clinical details</strong> \u2014 free-text field for relevant history, symptoms, and indication for imaging. This appears on the PDF for the radiologist",
      "<strong>Previous contrast reaction</strong> \u2014 toggle Yes/No. \u201CYes\u201D is highlighted on the PDF so the radiologist is aware",
      "<strong>eGFR</strong> \u2014 optional numeric field for renal function, important for contrast-enhanced studies",
    ],
    image: "/slides/form-request-details.png",
    imageAlt: "Request details section",
  },
  {
    type: "content" as const,
    label: "Step 4 \u2014 Referring Provider",
    title: "Select Your Provider Number",
    description:
      "Choose which provider number and clinic location to use for this request. You can have multiple provider numbers for different locations \u2014 CURA, hospital clinics, or private rooms.",
    bullets: [
      "Your <strong>configured provider numbers</strong> are listed in the dropdown \u2014 each linked to a specific clinic location (e.g. CURA Medical Specialists, RPAH, Central Coast Neurosciences)",
      "If you have a <strong>default provider</strong> set, it will be pre-selected automatically \u2014 switch to a different location for any individual request",
      "The selected provider\u2019s <strong>clinic name, address, phone, fax, and email</strong> all appear in the PDF header \u2014 so each request is branded to the location you\u2019re working from",
      "Your <strong>signature</strong> (uploaded in Settings) is shared across all locations \u2014 set it once",
      "Manage your provider numbers anytime in <strong>Settings \u2192 Provider Numbers</strong> \u2014 add new locations as needed",
    ],
    image: "/slides/form-referring-provider.png",
    imageAlt: "Referring provider section",
  },
  {
    type: "content-reverse" as const,
    label: "Step 4 \u2014 Patient Copy & Submit",
    title: "Optional Patient Copy & Submit",
    description:
      "Optionally email a copy to the patient, then submit your request.",
    bullets: [
      "Tick <strong>\u201CSend a copy to the patient\u201D</strong> to email them a PDF copy of the request",
      "An email field appears when ticked \u2014 if an email was found in the patient details, it\u2019s pre-filled",
      "The patient\u2019s email is <strong>encrypted</strong> and never stored in plain text",
      "Click <strong>\u201CSubmit Request\u201D</strong> to send \u2014 or <strong>\u201CClear\u201D</strong> to reset the form",
      "Your form <strong>auto-saves as a draft</strong> every few seconds \u2014 refreshing or navigating away won\u2019t lose your work",
      "If you submit a <strong>duplicate</strong> (same patient + exam type today), you\u2019ll be asked to confirm",
    ],
    image: "/slides/form-patient-copy.png",
    imageAlt: "Patient copy section",
  },
  {
    type: "flow" as const,
    label: "Behind the Scenes",
    title: "What Happens After You Submit",
    description:
      'Once you click "Submit Request", everything is handled automatically. You don\u2019t need to wait.',
  },
  {
    type: "content-reverse" as const,
    label: "Tracking",
    title: "Request History",
    description:
      "View and search all your past imaging requests from the Request History page.",
    bullets: [
      "Filter by <strong>status</strong> (pending, delivered, failed), <strong>provider</strong>, or <strong>date range</strong>",
      "Search by <strong>patient name</strong> across all your requests",
      "Click any row to view full details, the delivery timeline, and the PDF",
      "Failed deliveries can be <strong>resent</strong> directly from the detail page",
    ],
    image: "/slides/slide-history.png",
    imageAlt: "Request history",
  },
  {
    type: "content" as const,
    label: "Settings",
    title: "Provider Numbers & Locations",
    description:
      "Manage your provider numbers for every location you work at. Each provider number is linked to a clinic, and its details appear on the PDF.",
    bullets: [
      "Add a provider number for <strong>each location</strong> you work at \u2014 CURA Medical Specialists, hospital clinics (e.g. RPAH, Nepean), private rooms, or any other site",
      "Each provider number carries its own <strong>clinic name, address, phone, fax, and email</strong> \u2014 these appear in the PDF header so the request is always branded to the right location",
      "Set a <strong>default provider</strong> to pre-select your most common location in the request form",
      "Switch between locations on a per-request basis \u2014 no need to log in and out of different accounts",
    ],
    image: "/slides/slide-providers.png",
    imageAlt: "Provider numbers settings",
  },
  {
    type: "content-reverse" as const,
    label: "Settings",
    title: "Your Signature",
    description:
      "Upload or draw your signature. It appears on every imaging request PDF you submit.",
    bullets: [
      "<strong>Draw</strong> directly on screen using your finger, stylus, or mouse",
      "Or <strong>upload</strong> a PNG, JPEG, or WebP image (max 2MB)",
      "Your signature is used across all provider numbers \u2014 set it once",
      "You can also <strong>change your password</strong> anytime from Settings",
    ],
    image: "/slides/slide-signature.png",
    imageAlt: "Signature settings",
  },
  {
    type: "tips" as const,
    label: "Good to Know",
    title: "Tips & Security",
    description: "A few things to keep in mind as you get started.",
  },
];

function SlideLabel({ label }: { label: string }) {
  return (
    <p className="text-xs uppercase tracking-[2px] text-teal-600 font-semibold mb-2">
      {label}
    </p>
  );
}

function SlideImage({ src, alt }: { src: string; alt: string }) {
  if (src === "mfa-illustration") {
    return (
      <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-gradient-to-br from-[#1a365d] to-[#0f2847] flex items-center justify-center p-12">
        <div className="text-center text-white">
          <div className="w-40 h-40 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <svg
              width="100"
              height="100"
              viewBox="0 0 120 120"
              className="opacity-90"
            >
              <rect x="10" y="10" width="30" height="30" rx="4" fill="#1a365d" />
              <rect x="50" y="10" width="10" height="10" fill="#1a365d" />
              <rect x="70" y="10" width="10" height="10" fill="#1a365d" />
              <rect
                x="80"
                y="10"
                width="30"
                height="30"
                rx="4"
                fill="#1a365d"
              />
              <rect x="10" y="50" width="10" height="10" fill="#1a365d" />
              <rect x="30" y="50" width="10" height="10" fill="#1a365d" />
              <rect x="50" y="50" width="10" height="10" fill="#1a365d" />
              <rect x="70" y="50" width="10" height="10" fill="#1a365d" />
              <rect x="100" y="50" width="10" height="10" fill="#1a365d" />
              <rect x="10" y="80" width="30" height="30" rx="4" fill="#1a365d" />
              <rect x="50" y="80" width="10" height="10" fill="#1a365d" />
              <rect x="80" y="80" width="10" height="10" fill="#1a365d" />
              <rect x="100" y="80" width="10" height="10" fill="#1a365d" />
              <rect
                x="18"
                y="18"
                width="14"
                height="14"
                rx="2"
                fill="#0d9488"
              />
              <rect
                x="88"
                y="18"
                width="14"
                height="14"
                rx="2"
                fill="#0d9488"
              />
              <rect
                x="18"
                y="88"
                width="14"
                height="14"
                rx="2"
                fill="#0d9488"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold mb-2">
            Scan with your authenticator app
          </p>
          <p className="text-sm text-white/50">
            Google Authenticator &middot; Authy &middot; Microsoft Authenticator
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-auto block" loading="lazy" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-teal-700">
              CURA
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              Onboarding Guide
            </span>
          </div>
          <a
            href="/login"
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            Go to Login &rarr;
          </a>
        </div>
      </header>

      {/* Slide 1: Title */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a365d] via-[#0f2847] to-[#0a1f3a] text-white py-32">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <div className="w-20 h-1 bg-teal-500 mx-auto mb-8 rounded" />
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            CURA Requests
          </h1>
          <p className="text-2xl text-white/60 font-light mb-4">
            Imaging Request System
          </p>
          <p className="text-base text-white/40 mb-10 max-w-lg mx-auto">
            One system for all your locations &mdash; CURA, hospital clinics, and
            private rooms
          </p>
          <span className="inline-block bg-teal-600 text-white px-5 py-2 rounded-full text-sm font-semibold uppercase tracking-wider">
            Onboarding Guide for Neurologists
          </span>
          <p className="mt-12 text-sm text-white/30">
            CURA Medical Specialists &middot; Secure &middot; Encrypted &middot;
            Audited
          </p>
        </div>
      </section>

      {/* PDF Showcase — lead with the output */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SlideLabel label="The Result" />
            <h2 className="text-4xl font-bold text-[#1a365d] mb-4">
              You Submit. We Deliver.
            </h2>
            <p className="text-base text-slate-500 mb-8 leading-relaxed">
              Fill in one form and a professional, clinic-branded PDF is
              generated and sent to everyone who needs it &mdash; simultaneously.
            </p>

            {/* Fan-out tree */}
            <div className="flex items-start gap-4">
              {/* Source */}
              <div className="flex flex-col items-center shrink-0 pt-[72px]">
                <div className="w-14 h-14 rounded-xl bg-teal-600 flex items-center justify-center text-white text-xl shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <span className="text-xs font-semibold text-slate-700 mt-2">Your Request</span>
              </div>

              {/* Connector lines */}
              <div className="flex flex-col items-center shrink-0 pt-[72px]">
                <div className="w-8 h-px bg-slate-300 mt-[6px]" />
              </div>

              {/* Destinations */}
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Radiology Practice</p>
                    <p className="text-xs text-slate-400">Emailed to the practice (fax fallback)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Patient</p>
                    <p className="text-xs text-slate-400">Optional copy emailed to the patient</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Your Clinic</p>
                    <p className="text-xs text-slate-400">Filing copy emailed to your clinic</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Stored &amp; Printable</p>
                    <p className="text-xs text-slate-400">View, print, or resend from your dashboard</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/slides/slide-pdf-preview.png"
              alt="Example imaging request PDF"
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Slide 2: What & Why */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SlideLabel label="Overview" />
          <h2 className="text-4xl font-bold text-[#1a365d] mb-4">
            What is CURA Requests?
          </h2>
          <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto">
            A purpose-built system for submitting radiology imaging requests. You
            fill in a form, we generate a professional PDF, and it&apos;s
            delivered automatically to the radiology practice via email (with fax
            fallback).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(slides[1] as { features: Array<{ icon: string; color: string; title: string; desc: string }> }).features.map(
              (f, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left shadow-sm"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${
                      f.color === "teal"
                        ? "bg-teal-100"
                        : f.color === "navy"
                          ? "bg-blue-100"
                          : f.color === "amber"
                            ? "bg-amber-100"
                            : "bg-red-100"
                    }`}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Content slides */}
      {slides.slice(2).map((slide, idx) => {
        const isEven = idx % 2 === 0;
        const bgClass = isEven ? "bg-slate-50" : "bg-white";

        if (slide.type === "flow") {
          return (
            <section key={idx} className={`py-24 ${bgClass}`}>
              <div className="max-w-4xl mx-auto px-6 text-center">
                <SlideLabel label={slide.label} />
                <h2 className="text-4xl font-bold text-[#1a365d] mb-4">
                  {slide.title}
                </h2>
                <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto">
                  {slide.description}
                </p>
                {/* Flow diagram */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-10">
                  {[
                    {
                      icon: "\uD83D\uDCC4",
                      label: "PDF Generated",
                      desc: "With your signature & clinic details",
                    },
                    {
                      icon: "\uD83D\uDCE7",
                      label: "Email to Practice",
                      desc: "Primary delivery method",
                    },
                    {
                      icon: "\uD83D\uDCC2",
                      label: "Filing Copy",
                      desc: "Emailed to your clinic",
                    },
                    {
                      icon: "\u2705",
                      label: "Done",
                      desc: "Track status on dashboard",
                    },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      {i > 0 && (
                        <span className="text-teal-500 font-bold text-xl hidden md:block">
                          &rarr;
                        </span>
                      )}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm min-w-[150px]">
                        <div className="text-2xl mb-1">{step.icon}</div>
                        <div className="text-sm font-semibold text-slate-800">
                          {step.label}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 text-left shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">
                      &#128224; Fax Fallback
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      If email delivery fails after 3 retries, the request is
                      automatically faxed to the practice via Notifyre
                      (Australian, healthcare-compliant).
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-6 text-left shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">
                      &#128236; Patient Copy
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      If you opted in, the patient receives their own copy by
                      email. Their email address is encrypted and never stored in
                      plain text.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (slide.type === "tips") {
          const tips = [
            {
              icon: "\uD83D\uDCBE",
              title: "Auto-Saved Drafts",
              desc: "Your request form saves automatically as you type. If you refresh or navigate away, your draft will be restored.",
            },
            {
              icon: "\uD83D\uDD12",
              title: "Session Timeout",
              desc: 'Sessions expire after 15 minutes for security. You\'ll be redirected to log in again. "Remember device" keeps MFA easy.',
            },
            {
              icon: "\uD83D\uDD10",
              title: "Encrypted PHI",
              desc: "All patient data is encrypted at field level in the database. PDFs are encrypted on disk. No PHI in logs.",
            },
            {
              icon: "\uD83D\uDCCB",
              title: "Audit Logged",
              desc: "Every login, request submission, and delivery attempt is logged with timestamps and user IDs for compliance.",
            },
            {
              icon: "\uD83D\uDCF1",
              title: "Mobile Friendly",
              desc: "The interface works on tablets and phones. You can draw your signature with your finger on a touch screen.",
            },
            {
              icon: "\uD83D\uDE4C",
              title: "Need Help?",
              desc: "Contact your system administrator for account issues, provider number changes, or technical support.",
            },
          ];
          return (
            <section key={idx} className={`py-24 ${bgClass}`}>
              <div className="max-w-5xl mx-auto px-6 text-center">
                <SlideLabel label={slide.label} />
                <h2 className="text-4xl font-bold text-[#1a365d] mb-4">
                  {slide.title}
                </h2>
                <p className="text-lg text-slate-500 mb-10">
                  {slide.description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {tips.map((tip, i) => (
                    <div
                      key={i}
                      className="bg-white border border-slate-200 rounded-xl p-6 text-left shadow-sm"
                    >
                      <div className="text-2xl mb-2">{tip.icon}</div>
                      <h3 className="text-sm font-semibold text-[#1a365d] mb-2">
                        {tip.title}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {tip.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (
          slide.type === "content" ||
          slide.type === "content-reverse"
        ) {
          const reversed = slide.type === "content-reverse";
          return (
            <section key={idx} className={`py-24 ${bgClass}`}>
              <div
                className={`max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  reversed ? "lg:direction-rtl" : ""
                }`}
              >
                {reversed ? (
                  <>
                    <div className="order-2 lg:order-1">
                      <SlideImage
                        src={slide.image}
                        alt={slide.imageAlt}
                      />
                    </div>
                    <div className="order-1 lg:order-2">
                      <SlideLabel label={slide.label} />
                      <h2 className="text-3xl font-bold text-[#1a365d] mb-3">
                        {slide.title}
                      </h2>
                      <p className="text-base text-slate-500 mb-5 leading-relaxed">
                        {slide.description}
                      </p>
                      <ul className="space-y-3">
                        {slide.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="flex gap-3 text-sm text-slate-500 leading-relaxed"
                          >
                            <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            <span dangerouslySetInnerHTML={{ __html: b }} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <SlideLabel label={slide.label} />
                      <h2 className="text-3xl font-bold text-[#1a365d] mb-3">
                        {slide.title}
                      </h2>
                      <p className="text-base text-slate-500 mb-5 leading-relaxed">
                        {slide.description}
                      </p>
                      <ul className="space-y-3">
                        {slide.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="flex gap-3 text-sm text-slate-500 leading-relaxed"
                          >
                            <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            <span dangerouslySetInnerHTML={{ __html: b }} />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <SlideImage
                        src={slide.image}
                        alt={slide.imageAlt}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* Footer */}
      <footer className="bg-[#1a365d] text-white/40 py-8 text-center text-sm">
        <p>
          CURA Medical Specialists &middot; Imaging Request System &middot;{" "}
          {new Date().getFullYear()}
        </p>
        <a
          href="/login"
          className="inline-block mt-3 text-teal-400 hover:text-teal-300 font-medium"
        >
          Go to Login &rarr;
        </a>
      </footer>
    </div>
  );
}
