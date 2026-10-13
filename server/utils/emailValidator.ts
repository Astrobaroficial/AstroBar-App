const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'trashmail.com', 'dispostable.com', 'getnada.com',
  'fakemailgenerator.com', 'maildrop.cc', 'sharklasers.com',
  'yandex.com', 'temp-mail.org'
]);

export function validateEmailRealism(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'El correo electrónico es requerido.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'El formato del correo electrónico no es válido.' };
  }

  const [username, domain] = cleanEmail.split('@');

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { isValid: false, error: 'No se permiten correos electrónicos temporales o desechables.' };
  }

  // Bloquea correos si el usuario son 7 o más números consecutivos (ej: 21412512512@gmail.com)
  const isOnlyDigits = /^\d{7,}$/.test(username);
  if (isOnlyDigits) {
    return { isValid: false, error: 'Ingresa un correo personal válido (evita secuencias de solo números).' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'El nombre de usuario del correo es demasiado corto.' };
  }

  return { isValid: true };
}