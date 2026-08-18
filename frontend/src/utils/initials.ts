export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';
}

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

export function maskPhone(phone: string): string {
  if (!phone) return '+91 ••••• •••••';
  return `+91 ••••• ${phone.slice(-5)}`;
}
