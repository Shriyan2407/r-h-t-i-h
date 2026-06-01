import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getPasswordStrength(password: string): {
  score:    number;   // 0-4
  label:    string;
  color:    string;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8)  score++; else feedback.push("8+ characters");
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++; else feedback.push("uppercase letter");
  if (/[0-9]/.test(password)) score++; else feedback.push("number");
  if (/[^A-Za-z0-9]/.test(password)) score++; else feedback.push("special character");

  const normalized = Math.min(4, Math.floor((score / 5) * 5));

  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too weak",  color: "#FF4D4D" },
    1: { label: "Weak",      color: "#FF8C00" },
    2: { label: "Fair",      color: "#FFD700" },
    3: { label: "Strong",    color: "#00CC7A" },
    4: { label: "Very strong", color: "#00FF9C" },
  };

  return { score: normalized, feedback, ...map[normalized] };
}
