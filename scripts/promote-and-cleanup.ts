/**
 * One-off script to:
 * 1. Promote stephen.winters@gmail.com to admin
 * 2. Remove admin@curaspecialists.com.au
 *
 * Run with: npx tsx scripts/promote-and-cleanup.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Promote stephen.winters@gmail.com to admin
  const stephen = await prisma.user.findUnique({
    where: { email: "stephen.winters@gmail.com" },
    select: { id: true, role: true },
  });

  if (!stephen) {
    console.error("ERROR: stephen.winters@gmail.com not found in database.");
    console.error("Make sure this account exists before running this script.");
    process.exit(1);
  }

  if (stephen.role === "admin") {
    console.log("stephen.winters@gmail.com is already admin — skipping promotion.");
  } else {
    await prisma.user.update({
      where: { email: "stephen.winters@gmail.com" },
      data: { role: "admin" },
    });
    console.log("Promoted stephen.winters@gmail.com to admin.");
  }

  // 2. Remove admin@curaspecialists.com.au
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@curaspecialists.com.au" },
    select: { id: true },
  });

  if (!adminUser) {
    console.log("admin@curaspecialists.com.au not found — already removed.");
  } else {
    // Check if admin user owns any requests or audit logs that would block deletion
    const requestCount = await prisma.imagingRequest.count({
      where: { createdBy: adminUser.id },
    });

    if (requestCount > 0) {
      console.warn(
        `WARNING: admin@curaspecialists.com.au has ${requestCount} requests. Deactivating instead of deleting.`
      );
      await prisma.user.update({
        where: { email: "admin@curaspecialists.com.au" },
        data: { lockedAt: new Date("2099-12-31") },
      });
      console.log("Deactivated admin@curaspecialists.com.au (locked until 2099).");
    } else {
      await prisma.user.delete({
        where: { email: "admin@curaspecialists.com.au" },
      });
      console.log("Deleted admin@curaspecialists.com.au.");
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
