/**
 * Seeds a verified test user with a small portfolio when E2E_DATABASE_URL is set (CI provides an empty Postgres).
 * Refuses to run against anything that does not look like a disposable local/CI database.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const E2E_USER = { email: "e2e-user@example.test", password: "E2e-Test-Password-9!" };

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) return;
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "postgres"].includes(host)) {
    throw new Error(`E2E_DATABASE_URL host "${host}" is not a local/CI database; refusing to seed`);
  }
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const hashedPassword = await bcrypt.hash(E2E_USER.password, 10);
    const user = await prisma.user.upsert({
      where: { email: E2E_USER.email },
      update: { hashedPassword, emailVerified: new Date(), sessionVersion: 0 },
      create: { email: E2E_USER.email, name: "E2E User", hashedPassword, emailVerified: new Date() },
    });
    const portfolio = await prisma.portfolio.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    await prisma.portfolioHolding.deleteMany({ where: { portfolioId: portfolio.id } });
    await prisma.portfolioHolding.createMany({
      data: [
        { portfolioId: portfolio.id, ticker: "RELIANCE", name: "Reliance Industries", sector: "Energy", quantity: 10, avgPrice: 1300 },
        { portfolioId: portfolio.id, ticker: "TCS", name: "Tata Consultancy Services", sector: "IT", quantity: 5, avgPrice: 3500 },
        { portfolioId: portfolio.id, ticker: "HDFCBANK", name: "HDFC Bank", sector: "Banks", quantity: 12, avgPrice: 1600 },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
}
