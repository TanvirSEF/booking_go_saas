import bcrypt from 'bcryptjs';

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword?: string
): Promise<boolean> {
  if (!hashedPassword) {
    return false;
  }

  const normalizedHash = hashedPassword.startsWith('$2y$')
    ? hashedPassword.replace(/^\$2y\$/, '$2a$')
    : hashedPassword;

  return bcrypt.compare(plainPassword, normalizedHash);
}
