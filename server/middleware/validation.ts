import validator from 'validator';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return validator.isEmail(email);
}

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export function isStrongPassword(password: string): boolean {
  return validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  });
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return validator.escape(validator.trim(input));
}

/**
 * Validate name (2-100 characters, letters and spaces only)
 */
export function isValidName(name: string): boolean {
  return name.length >= 2 && name.length <= 100 && /^[a-zA-ZÀ-ÿ\s]+$/.test(name);
}

/**
 * Password validation error messages
 */
export function getPasswordValidationError(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}
