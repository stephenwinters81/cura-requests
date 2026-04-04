# Requests v1.0 — Feature List

## Staff Features

### Submit an Imaging Request
- Fill out a single form to send an imaging request to any radiology practice
- Search for a radiology practice by name — recently-used practices appear first
- If the practice isn't listed, enter their details manually (name, fax, email, etc.)
- Select the exam type from a searchable dropdown (27 types + "Other" with free text)
- Select your provider number — auto-selected based on your login
- Paste patient details (name, DOB, Medicare, phone, address) into one text box — the system extracts the fields automatically
- Tick "Ask Dr Bhatia to report" if needed
- Optionally send a copy to the patient by entering their email and ticking the checkbox
- Add clinical details, contrast reaction history, and eGFR

### Form Convenience
- Form auto-saves as you type — if your session times out or you close the tab, your work is still there when you come back
- Keyboard-friendly — Tab through fields, Enter to submit
- Duplicate detection — if you submit the same patient + exam within 24 hours, the system warns you and asks for confirmation before proceeding
- Auto-focus on first field when the page loads

### What Happens After You Submit
- You see a success confirmation immediately — deliveries happen in the background
- The system generates a professional PDF and sends it to the practice via email and/or fax (based on the practice's contact details)
- A filing copy is always emailed to the clinic inbox
- If you ticked "send to patient", the patient gets an email copy too
- You can view or print the PDF from the success page or from request history

### Track Your Requests
- Dashboard shows your recent submissions and their delivery status
- Failed or pending deliveries are highlighted so you can spot problems immediately
- Click any request to see full details: what was sent, to whom, delivery status, timestamps
- Fax confirmations appear automatically when the fax provider confirms delivery

### Request History
- View all your past requests in a searchable, filterable table
- Filter by date range, provider, or delivery status
- Search by patient name
- Click any row to see full details and delivery timeline

### Re-send Failed Deliveries
- If a delivery fails (email bounced, fax didn't go through), you can re-send it with one click from the request detail page
- The system retries automatically up to 3 times before marking a delivery as failed

### Print
- View or print the PDF from any request detail page
- PDF is designed for print — clean, professional, medical-standard layout
- Includes doctor signature, provider number, and all request details

---

## Admin Features

Everything staff can do, plus:

### Manage Radiology Practices
- Add, edit, or remove radiology practices
- Each practice has: name, address, phone, fax number, email
- At least one contact method (email or fax) is required
- Practices are searchable from the request form — no developer involvement needed
- See how often each practice is used (usage count)

### Manage Staff Accounts
- Create new staff accounts (generates a temporary password shown once)
- New users must set up MFA (authenticator app) on first login
- Assign roles: Admin or Staff
- Edit user details, reset passwords, toggle active/inactive
- Cannot delete yourself or demote the last admin

### Manage API Keys (Synaptum 8)
- Create API keys for Synaptum 8 to submit requests programmatically
- Each key is scoped (choose which actions it can perform)
- Optionally set an expiry date and restrict to specific IP addresses
- Configure a webhook URL so Synaptum 8 receives delivery status updates automatically
- View last-used timestamp for each key
- Revoke keys instantly when no longer needed
- Full key is shown once at creation — only the prefix is visible afterwards

### View All Requests
- See every request submitted by any staff member (not just your own)
- Same filters and search as staff, but across the whole team

### Audit Trail
- Every action is logged: who did what, when, and to which record
- Logins, form submissions, practice changes, user changes, API calls — all tracked
- No patient data in the audit log — only record IDs for traceability

---

## Login & Security (All Users)

### Login
- Log in with your email and password
- MFA is mandatory — you'll need an authenticator app (Google Authenticator, Authy, etc.)
- First login walks you through MFA setup with a QR code
- Account locks for 30 minutes after 5 failed login attempts
- Session times out after 15 minutes of inactivity (your form auto-save is preserved)

### Security (Handled Automatically)
- All data encrypted in transit (HTTPS) and at rest (field-level encryption for patient data)
- PDFs encrypted on disk
- Patient data kept for 90 days active, then archived encrypted for 7 years
- No patient data visible in logs or error messages
- The entire app is behind login — no public pages

---

## Synaptum 8 Integration

For requests created from within Synaptum 8 (via the API):

### What Synaptum 8 Can Do
- Look up radiology practices, providers, and exam types
- Submit imaging requests with patient details, exam type, and clinical information
- Check delivery status of any request it created
- Download the generated PDF
- Re-send failed deliveries
- Receive webhook notifications when deliveries complete or fail

### How It Works
- Synaptum 8 sends patient details to Requests via a secure API call
- Requests generates the PDF and sends it to the practice (email/fax) — same as a manual submission
- Synaptum 8 gets notified automatically when the delivery succeeds or fails
- The request appears in the dashboard alongside manually-submitted requests
- All API actions are audit-logged with the API key identity

### What It Cannot Do
- Cannot read patient data back (PHI is write-only via API)
- Cannot manage users or practices (admin-only via the web UI)
- Cannot bypass rate limits or duplicate detection
