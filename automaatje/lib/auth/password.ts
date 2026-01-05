import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Wachtwoord moet minimaal 8 tekens bevatten",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Wachtwoord moet minimaal één hoofdletter bevatten",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Wachtwoord moet minimaal één kleine letter bevatten",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Wachtwoord moet minimaal één cijfer bevatten",
    };
  }

  return { valid: true };
}
