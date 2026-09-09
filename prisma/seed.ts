import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Seeding database...");

  const roles = [
    {
      name: "SUPER_ADMIN",
      description: "Full access to the CRM system",
    },
    {
      name: "ADMIN",
      description: "Operational CRM management access",
    },
    {
      name: "SALES",
      description: "Sales and deal management access",
    },
    {
      name: "MARKETING",
      description: "Lead and marketing management access",
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        description: role.description,
      },
      create: role,
    });
  }

  const superAdminRole = await prisma.role.findUnique({
    where: {
      name: "SUPER_ADMIN",
    },
  });

  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role was not created");
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is not set");
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: {
      email: "admin@crm.local",
    },
    update: {
      name: "Super Admin",
      password: hashedPassword,
      roleId: superAdminRole.id,
      isActive: true,
    },
    create: {
      name: "Super Admin",
      email: "admin@crm.local",
      password: hashedPassword,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  console.log("Seed completed successfully.");
  console.log("Roles created: SUPER_ADMIN, ADMIN, SALES, MARKETING");
  console.log("Super Admin: admin@crm.local");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
