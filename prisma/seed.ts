import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const providers = [
  { doctorName: "Winters", providerNumber: "4111709B", location: "RPAH" },
  { doctorName: "Winters", providerNumber: "411170ML", location: "CURA Medical Specialists" },
  { doctorName: "Winters", providerNumber: "411170GH", location: "Central Coast Neurosciences" },
  { doctorName: "Harrison", providerNumber: "4758688Y", location: "CURA Medical Specialists" },
  { doctorName: "Harrison", providerNumber: "4758689J", location: "Dubbo Hospital" },
  { doctorName: "Harrison", providerNumber: "475868AX", location: "Nepean Hospital" },
  { doctorName: "Khalil", providerNumber: "1640066F", location: "CURA Medical Specialists" },
];

async function main() {
  console.log("Seeding database...");

  // Enable pgcrypto extension
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  console.log("pgcrypto extension enabled");

  // Upsert providers
  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { providerNumber: provider.providerNumber },
      update: {
        doctorName: provider.doctorName,
        location: provider.location,
      },
      create: {
        doctorName: provider.doctorName,
        providerNumber: provider.providerNumber,
        location: provider.location,
      },
    });
    console.log(`Upserted provider: ${provider.doctorName} - ${provider.providerNumber}`);
  }

  // Upsert admin user
  const passwordHash = await bcrypt.hash("changeme123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@curaspecialists.com.au" },
    update: {
      name: "Admin",
      passwordHash,
      role: "admin",
    },
    create: {
      email: "admin@curaspecialists.com.au",
      name: "Admin",
      passwordHash,
      role: "admin",
      mfaEnabled: false,
    },
  });
  console.log("Upserted admin user: admin@curaspecialists.com.au");

  // Doctor users — each linked to their own provider numbers
  const doctors = [
    {
      email: "winters@curaspecialists.com.au",
      name: "Dr Winters",
      providerNumbers: ["4111709B", "411170ML", "411170GH"],
    },
    {
      email: "harrison@curaspecialists.com.au",
      name: "Dr Harrison",
      providerNumbers: ["4758688Y", "4758689J", "475868AX"],
    },
    {
      email: "khalil@curaspecialists.com.au",
      name: "Dr Khalil",
      providerNumbers: ["1640066F"],
    },
  ];

  for (const doc of doctors) {
    const providerRecords = await prisma.provider.findMany({
      where: { providerNumber: { in: doc.providerNumbers } },
      select: { id: true },
    });
    const defaultProvider = providerRecords[0];

    await prisma.user.upsert({
      where: { email: doc.email },
      update: {
        name: doc.name,
        defaultProviderId: defaultProvider?.id,
        providers: {
          set: providerRecords.map((p) => ({ id: p.id })),
        },
      },
      create: {
        email: doc.email,
        name: doc.name,
        passwordHash,
        role: "staff",
        mfaEnabled: false,
        defaultProviderId: defaultProvider?.id,
        providers: {
          connect: providerRecords.map((p) => ({ id: p.id })),
        },
      },
    });
    console.log(`Upserted doctor: ${doc.name} (${doc.email}) with ${providerRecords.length} providers`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
