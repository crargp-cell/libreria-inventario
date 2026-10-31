import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

// Hash válido de una contraseña aleatoria, usado para igualar el tiempo de
// respuesta del login cuando el usuario no existe (evita enumeración de emails).
export const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', SALT_ROUNDS);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Devuelve un mensaje de error si la contraseña no cumple la política, o null si es válida.
export function validatePasswordPolicy(password: unknown): string | null {
  if (typeof password !== 'string') return 'Password must be a string';
  if (password.length < 8) return 'Password must be at least 8 characters';
  // bcrypt ignora todo lo que pasa de 72 bytes
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Password must be at most 72 bytes';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain letters and numbers';
  }
  return null;
}
