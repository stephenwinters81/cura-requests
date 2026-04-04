# Notifiable Data Breaches Response Plan

**CURA Medical Specialists -- Requests v1.0**

| | |
|---|---|
| **Document Owner** | Practice Manager |
| **Version** | 1.0 |
| **Effective Date** | 2026-04-03 |
| **Annual Review Due** | 2027-04-03 |
| **Classification** | INTERNAL -- RESTRICTED |

---

## 1. Purpose

This plan establishes CURA Medical Specialists' response procedure for data breaches involving personal information handled by the Requests imaging request system, in compliance with Part IIIC of the *Privacy Act 1988* (Cth) -- the Notifiable Data Breaches (NDB) scheme.

The plan ensures that eligible data breaches are identified, contained, assessed, and reported to the Office of the Australian Information Commissioner (OAIC) and affected individuals within the statutory timeframes.

## 2. Scope

This plan applies to all personal information and protected health information (PHI) processed, stored, or transmitted by the Requests system, including:

- Patient names, dates of birth, Medicare numbers, phone numbers, email addresses, and residential addresses
- Imaging request details and clinical notes
- PDF imaging request forms (generated and stored encrypted)
- Delivery records (email and fax transmissions)
- User account credentials and authentication data
- Audit logs containing record identifiers

This plan covers breaches originating from:

- Unauthorized access to the application or database
- Unauthorized disclosure (e.g., misdirected fax or email)
- Loss of data (e.g., unrecoverable system failure without backup)
- Compromise of encryption keys or credentials
- Third-party provider incidents (Notifyre, Google Workspace SMTP)

## 3. Definitions

**Eligible Data Breach:** A data breach that is likely to result in serious harm to any individual whose personal information is involved. Under s 26WE of the Privacy Act, an eligible data breach occurs when:

1. There is unauthorized access to, unauthorized disclosure of, or loss of personal information held by the entity; AND
2. A reasonable person would conclude that the access, disclosure, or loss would be likely to result in serious harm to any of the individuals to whom the information relates.

**Serious Harm:** Includes but is not limited to identity theft, financial loss, damage to reputation, emotional distress, or physical harm. For health information, the inherent sensitivity of the data means the threshold for serious harm is lower.

**PHI (Protected Health Information):** Any personal information collected in the course of providing a health service, including patient demographics, Medicare numbers, and clinical request details.

## 4. Responsible Persons

| Role | Name | Contact |
|---|---|---|
| **Breach Response Lead** | [PRACTICE MANAGER NAME] | [PHONE] / [EMAIL] |
| **IT Contact** | [IT CONTACT NAME] | [PHONE] / [EMAIL] |
| **Senior Clinician** | [DR NAME] | [PHONE] / [EMAIL] |
| **External Legal Advisor** | [FIRM NAME] | [PHONE] / [EMAIL] |
| **Cyber Insurance Provider** | [PROVIDER NAME] | Policy #: [NUMBER] / [PHONE] |

The **Breach Response Lead** (Practice Manager) is the named responsible person for all NDB obligations. In their absence, the Senior Clinician assumes this role.

## 5. Breach Response Procedure

### Phase 1: Contain (Immediate -- within hours)

Upon suspicion or discovery of a data breach:

1. **Record the time and date** of discovery and the person who identified the breach.
2. **Immediately contain the breach** by taking one or more of the following actions as appropriate:
   - Isolate the affected system from the network (stop the Next.js application and BullMQ worker via PM2).
   - Revoke compromised credentials (database passwords, API keys, SMTP passwords, encryption keys).
   - Disable affected user accounts.
   - Block the source IP address via UFW firewall.
   - If a misdirected fax/email: contact the unintended recipient and request secure destruction.
3. **Preserve all evidence.** Do not delete logs, modify database records, or restart services until forensic information has been captured. Take disk snapshots if possible.
4. **Notify the Breach Response Lead** immediately, regardless of the time of day.

### Phase 2: Assess (Within 30 calendar days of awareness)

The Breach Response Lead must conduct a reasonable and expeditious assessment to determine whether the breach is an eligible data breach. The assessment must be completed within **30 calendar days** of the entity becoming aware of reasonable grounds to suspect a breach (s 26WH).

The assessment must determine:

1. **What information was involved?**
   - Identify the specific data fields compromised (names, DOB, Medicare numbers, clinical details, etc.).
   - Determine the number of affected individuals.
   - Identify whether encrypted data was compromised alongside encryption keys.

2. **What was the nature of the breach?**
   - Unauthorized access (e.g., system intrusion, credential compromise)
   - Unauthorized disclosure (e.g., misdirected delivery, API data leak)
   - Loss of data (e.g., unrecoverable deletion, ransomware)

3. **Who had access to the information?**
   - Was the recipient known or unknown?
   - Is the recipient likely to be malicious?
   - Has the information been further disseminated?

4. **Is serious harm likely?**
   - Apply the "reasonable person" test (s 26WG).
   - Consider the sensitivity of health information (inherently high risk).
   - Consider whether remedial action has reduced the risk (e.g., data was encrypted, recipient confirmed deletion).
   - Consider the nature of the individuals affected (patients).

**If at any point during the assessment** it becomes clear that the breach is an eligible data breach, proceed to Phase 3 immediately -- do not wait for the 30-day period to expire.

**If the assessment concludes** the breach is NOT an eligible data breach (serious harm is not likely), document the reasoning and file in the breach register. No OAIC notification is required.

### Phase 3: Notify (As soon as practicable after assessment)

If the breach is assessed as an eligible data breach:

#### 3a. Notify the OAIC

Submit a statement to the OAIC **as soon as practicable** via the online Notifiable Data Breach form:

- **URL:** https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach
- **Phone:** 1300 363 992

The statement must include (s 26WK):

1. The identity and contact details of CURA Medical Specialists.
2. A description of the eligible data breach.
3. The kind(s) of information involved.
4. Recommendations about the steps individuals should take in response.

#### 3b. Notify Affected Individuals

Notify each affected individual (or if not practicable, publish a statement on the practice website and take reasonable steps to publicise it). Notification must include the same information provided to the OAIC.

**Notification methods (in order of preference):**

1. **Phone call** to the patient, followed by
2. **Written letter** sent to the patient's last known address.
3. If the individual cannot be contacted: publish a notice on the practice website and in the waiting room.

**Template notification letter** should be prepared in advance and stored at: `docs/templates/breach-notification-letter.docx` (to be created before go-live).

#### 3c. Notify Other Parties (as applicable)

- **Australian Cyber Security Centre (ACSC):** Report via https://www.cyber.gov.au/report if a cyber incident is involved.
- **Cyber insurance provider:** Notify per policy terms.
- **Notifyre / third-party providers:** If the breach involves a third-party service, notify them and request their incident report.
- **Referring doctors** (Winters, Harrison, Khalil): Inform of any impact to their provider information or patient data.

## 6. Containment and Remediation Checklist

| Action | Responsible | Completed |
|---|---|---|
| System isolated (PM2 stop all) | IT Contact | [ ] |
| Network access restricted (UFW/VPN) | IT Contact | [ ] |
| Compromised credentials rotated | IT Contact | [ ] |
| Affected user accounts disabled | Breach Response Lead | [ ] |
| Disk snapshot / backup taken | IT Contact | [ ] |
| Application logs preserved and exported | IT Contact | [ ] |
| Audit logs preserved and exported | IT Contact | [ ] |
| Database backup taken (pre-remediation) | IT Contact | [ ] |
| Root cause identified | IT Contact | [ ] |
| Vulnerability patched / mitigated | IT Contact | [ ] |
| System restored and verified | IT Contact | [ ] |
| Monitoring enhanced for recurrence | IT Contact | [ ] |

## 7. Breach Register

All suspected and confirmed breaches must be recorded in the breach register, regardless of whether they are assessed as eligible data breaches. The register must include:

| Field | Description |
|---|---|
| Breach ID | Sequential identifier (e.g., BR-2026-001) |
| Date Discovered | Date and time the breach was identified |
| Date Contained | Date and time containment was achieved |
| Discovered By | Name of person who identified the breach |
| Description | Summary of what occurred |
| Data Involved | Types of personal information affected |
| Individuals Affected | Number and identification of affected persons |
| Assessment Outcome | Eligible / Not Eligible / Suspected |
| Assessment Completed | Date assessment was finalised |
| OAIC Notified | Yes / No + Date |
| Individuals Notified | Yes / No + Date + Method |
| Root Cause | Technical or procedural cause |
| Remediation Actions | Steps taken to prevent recurrence |
| Review Date | Date of post-incident review |

The breach register is maintained by the Breach Response Lead and stored securely (not within the Requests system itself).

## 8. Post-Incident Review

Within **14 days** of the breach being resolved, the Breach Response Lead must convene a post-incident review to:

1. Confirm the root cause has been addressed.
2. Assess whether existing security controls were adequate.
3. Identify process improvements (technical, procedural, training).
4. Update this response plan if gaps were identified.
5. Determine whether additional security measures are required (e.g., enhanced monitoring, additional encryption, access control changes).
6. Brief all staff on lessons learned (without disclosing patient details).

The review findings must be documented and filed with the breach register entry.

## 9. Staff Obligations

All staff with access to the Requests system must:

- Report any suspected data breach to the Breach Response Lead **immediately** upon discovery.
- Not attempt to investigate or remediate a breach independently.
- Not discuss breach details with anyone outside the response team.
- Cooperate fully with the assessment and response process.
- Complete annual privacy and data breach awareness training.

## 10. Testing and Review

- This plan must be **reviewed annually** (next review: 2027-04-03).
- A **tabletop exercise** simulating a data breach scenario should be conducted annually.
- The plan must be **updated** whenever there is a material change to the Requests system, its hosting environment, or third-party providers.
- All staff must be made aware of this plan and know where to find it.

## 11. Key Contacts

| Contact | Details |
|---|---|
| **OAIC (Office of the Australian Information Commissioner)** | |
| Online breach report | https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach |
| Phone | 1300 363 992 |
| Email | enquiries@oaic.gov.au |
| **Australian Cyber Security Centre (ACSC)** | |
| Report a cyber incident | https://www.cyber.gov.au/report |
| Phone | 1300 CYBER1 (1300 292 371) |
| **Practice Manager** | [NAME] -- [PHONE] -- [EMAIL] |
| **IT Contact** | [NAME] -- [PHONE] -- [EMAIL] |
| **Senior Clinician** | [DR NAME] -- [PHONE] -- [EMAIL] |
| **Legal Advisor** | [FIRM] -- [PHONE] |
| **Cyber Insurance** | [PROVIDER] -- Policy #[NUMBER] -- [PHONE] |
| **Notifyre Support** | support@notifyre.com.au |

## 12. Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-04-03 | [AUTHOR] | Initial version |

---

*This document must be accessible to all staff and reviewed annually. It forms part of CURA Medical Specialists' compliance obligations under Part IIIC of the Privacy Act 1988 (Cth).*
