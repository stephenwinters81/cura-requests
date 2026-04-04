import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// --- Props Interfaces ---

export interface PDFRequestProps {
  id: string;
  examType: string;
  examOther?: string;
  clinicalDetails: string;
  contrastReaction: string;
  egfr?: string;
  reportByRadiologist?: string; // radiologist name, if requested
  createdAt: Date;
}

export interface PDFPatientProps {
  name?: string;
  dob?: string;
  medicare?: string;
  phone?: string;
  address?: string;
  rawText?: string;
}

export interface PDFPracticeProps {
  name: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

export interface PDFProviderProps {
  doctorName: string;
  providerNumber: string;
  location: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  signatureImagePath?: string;
}

export interface ImagingRequestPDFProps {
  request: PDFRequestProps;
  patient: PDFPatientProps;
  practice: PDFPracticeProps;
  provider: PDFProviderProps;
}

// --- Colours ---

const colors = {
  navy: "#1a365d",
  grey: "#6b7280",
  lightBg: "#f7fafc",
  border: "#d1d5db",
  red: "#dc2626",
};

// --- Styles ---

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 80,
    paddingHorizontal: 40,
    color: "#111827",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
  },
  headerContact: {
    fontSize: 8,
    color: colors.grey,
    textAlign: "right",
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: colors.navy,
    borderBottomStyle: "solid",
    marginBottom: 14,
  },

  // Title
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    textAlign: "center",
    marginBottom: 14,
  },

  // Section box
  section: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "solid",
    borderRadius: 3,
    padding: 10,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 8,
    color: colors.grey,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // To block
  toBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "solid",
    borderRadius: 3,
    padding: 10,
    marginBottom: 10,
    backgroundColor: colors.lightBg,
  },
  toRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  toLeft: {
    flex: 1,
  },
  toRight: {
    marginLeft: 12,
    padding: 8,
    borderWidth: 1.5,
    borderColor: colors.red,
    borderStyle: "solid",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 180,
  },
  toRightLabel: {
    fontSize: 7,
    color: colors.red,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  toRightName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.red,
    textAlign: "center",
  },
  practiceName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },

  // Patient
  patientRow: {
    flexDirection: "row",
  },
  patientCol: {
    flex: 1,
  },
  rawTextBlock: {
    fontFamily: "Courier",
    fontSize: 9,
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
  },

  // Labels and values
  label: {
    fontSize: 8,
    color: colors.grey,
    marginBottom: 1,
  },
  value: {
    fontSize: 10,
    marginBottom: 6,
  },
  valueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },

  // Request details
  examType: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  clinicalDetails: {
    fontSize: 10,
    lineHeight: 1.4,
    marginBottom: 6,
  },

  // Provider
  doctorName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  signatureImage: {
    maxWidth: 150,
    maxHeight: 60,
    marginTop: 6,
    marginBottom: 4,
  },
  signaturePlaceholder: {
    fontSize: 9,
    color: colors.grey,
    fontStyle: "italic",
    marginTop: 6,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  footerText: {
    fontSize: 8,
    color: colors.grey,
  },
  footerRef: {
    fontSize: 8,
    color: colors.grey,
    textAlign: "center",
  },
  footerRadiologist: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.red,
    textAlign: "right",
  },
  footerLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    borderBottomStyle: "solid",
    marginBottom: 4,
  },
  footerConfidential: {
    fontSize: 7,
    color: colors.grey,
    textAlign: "center",
  },
});

// --- Helpers ---

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function ContactLine({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Text style={styles.headerContact}>
      {label}: {value}
    </Text>
  );
}

// --- Patient Section ---

function PatientStructured({ patient }: { patient: PDFPatientProps }) {
  return (
    <View style={styles.patientRow}>
      <View style={styles.patientCol}>
        {patient.name && (
          <>
            <Text style={styles.label}>Patient Name</Text>
            <Text style={styles.value}>{patient.name}</Text>
          </>
        )}
        {patient.dob && (
          <>
            <Text style={styles.label}>Date of Birth</Text>
            <Text style={styles.value}>{patient.dob}</Text>
          </>
        )}
        {patient.medicare && (
          <>
            <Text style={styles.label}>Medicare No.</Text>
            <Text style={styles.value}>{patient.medicare}</Text>
          </>
        )}
      </View>
      <View style={styles.patientCol}>
        {patient.phone && (
          <>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{patient.phone}</Text>
          </>
        )}
        {patient.address && (
          <>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{patient.address}</Text>
          </>
        )}
      </View>
    </View>
  );
}

function PatientRawText({ rawText }: { rawText: string }) {
  return <Text style={styles.rawTextBlock}>{rawText}</Text>;
}

// --- Main Document ---

export function ImagingRequestPDF({
  request,
  patient,
  practice,
  provider,
}: ImagingRequestPDFProps) {
  const hasStructuredPatient = !!(
    patient.name ||
    patient.dob ||
    patient.medicare ||
    patient.phone ||
    patient.address
  );

  const examDisplay =
    request.examType === "Other" && request.examOther
      ? `Other: ${request.examOther}`
      : request.examType;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.logoText}>{provider.location}</Text>
            {provider.address && (
              <Text style={styles.headerContact}>{provider.address}</Text>
            )}
          </View>
          <View>
            <Text style={styles.headerContact}>
              Dr {provider.doctorName} — {provider.providerNumber}
            </Text>
            {provider.phone && (
              <Text style={styles.headerContact}>Ph: {provider.phone}</Text>
            )}
            {provider.fax && (
              <Text style={styles.headerContact}>Fax: {provider.fax}</Text>
            )}
            {provider.email && (
              <Text style={styles.headerContact}>{provider.email}</Text>
            )}
          </View>
        </View>

        {/* Horizontal rule */}
        <View style={styles.hr} />

        {/* Title */}
        <Text style={styles.title}>IMAGING REQUEST</Text>

        {/* To block */}
        <View style={styles.toBlock}>
          <Text style={styles.sectionLabel}>To</Text>
          <View style={styles.toRow}>
            <View style={styles.toLeft}>
              <Text style={styles.practiceName}>{practice.name}</Text>
              {practice.address && (
                <Text style={styles.value}>{practice.address}</Text>
              )}
              {practice.phone && (
                <Text style={styles.value}>Ph: {practice.phone}</Text>
              )}
              {practice.fax && (
                <Text style={styles.value}>Fax: {practice.fax}</Text>
              )}
              {practice.email && (
                <Text style={styles.value}>Email: {practice.email}</Text>
              )}
            </View>
            {request.reportByRadiologist && (
              <View style={styles.toRight}>
                <Text style={styles.toRightLabel}>Preferred Reporter</Text>
                <Text style={styles.toRightName}>
                  {request.reportByRadiologist}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Patient block */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Patient Details</Text>
          {hasStructuredPatient ? (
            <PatientStructured patient={patient} />
          ) : patient.rawText ? (
            <PatientRawText rawText={patient.rawText} />
          ) : (
            <Text style={styles.value}>No patient details provided</Text>
          )}
        </View>

        {/* Request block */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Request Details</Text>
          <Text style={styles.label}>Exam Type</Text>
          <Text style={styles.examType}>{examDisplay}</Text>
          <Text style={styles.label}>Clinical Details</Text>
          <Text style={styles.clinicalDetails}>
            {request.clinicalDetails}
          </Text>
          <Text style={styles.label}>Previous Contrast Reaction</Text>
          <Text style={styles.value}>
            {request.contrastReaction === "yes" ? "Yes" : "No"}
          </Text>
          {request.egfr && (
            <>
              <Text style={styles.label}>eGFR</Text>
              <Text style={styles.value}>{request.egfr}</Text>
            </>
          )}
        </View>

        {/* Referring doctor block */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Referring Doctor</Text>
          <Text style={styles.doctorName}>{provider.doctorName}</Text>
          <Text style={styles.label}>Provider Number</Text>
          <Text style={styles.value}>{provider.providerNumber}</Text>
          {provider.signatureImagePath ? (
            <Image
              src={provider.signatureImagePath}
              style={styles.signatureImage}
            />
          ) : (
            <Text style={styles.signaturePlaceholder}>
              [Signature on file]
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {formatDate(request.createdAt)}
            </Text>
            <Text style={styles.footerRef}>Ref: {request.id}</Text>
            <Text style={styles.footerText}> </Text>
          </View>
          <View style={styles.footerLine} />
          <Text style={styles.footerConfidential}>
            CURA Medical Specialists - Confidential
          </Text>
        </View>
      </Page>
    </Document>
  );
}
