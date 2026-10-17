#!/usr/bin/env node
/**
 * Grant or revoke the ADMIN role. This is the ONLY supported way to create an admin:
 * it needs direct database access (DATABASE_URL), so it cannot be triggered from the app.
 *
 *   npm run admin:promote -- someone@example.com            # grant ADMIN
 *   npm run admin:promote -- someone@example.com --revoke   # back to USER
 *
 * The account must already exist and have a verified email address.
 */
import { PrismaClient } from "@prisma/client";

const [email, flag] = process.argv.slice(2);
const revoke = flag === "--revoke";

if (!email || email.startsWith("-")) {
  console.error("Usage: npm run admin:promote -- <email> [--revoke]");
  process.exit(2);
}

const prisma = new PrismaClient();

try {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: { id: true, email: true, role: true, emailVerified: true },
  });

  if (!user) {
    console.error(`No account found for ${normalized}.`);
    process.exit(1);
  }
  if (!revoke && !user.emailVerified) {
    console.error(`${user.email} has not verified their email address; refusing to grant ADMIN.`);
    process.exit(1);
  }

  const role = revoke ? "USER" : "ADMIN";
  if (user.role === role) {
    console.log(`${user.email} is already ${role}. Nothing to do.`);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      // Bumping the session version signs the user out everywhere, so a role
      // change takes effect immediately instead of when their token next refreshes.
      data: { role, sessionVersion: { increment: 1 } },
    });
    console.log(`${user.email}: ${user.role} -> ${role}`);
  }
} finally {
  await prisma.$disconnect();
}
