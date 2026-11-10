require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("Testing Prisma Client queryRaw to Neon...");
  try {
    const res = await prisma.$queryRaw`SELECT 1 as connected;`;
    console.log("PRISMA CLIENT SUCCESS:", res);
    await prisma.$disconnect();
  } catch (err) {
    console.error("PRISMA CLIENT FAILED:", err);
  }
}

main();

