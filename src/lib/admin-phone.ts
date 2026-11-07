export function normalizeAdminPhone(phone: string): string {
  let compact = phone.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;

  const digits = compact.replace(/\D/g, "");
  if (digits.startsWith("251") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+251${digits.slice(1)}`;
  }
  if (digits.startsWith("9") && digits.length === 9) {
    return `+251${digits}`;
  }

  return compact;
}

export function getAdminPhoneCandidates(phone: string): string[] {
  const original = phone.trim();
  const compact = original.replace(/[\s().-]/g, "");
  const normalized = normalizeAdminPhone(original);
  const candidates = new Set([original, compact, normalized]);

  if (/^\+2519\d{8}$/.test(normalized)) {
    const national = normalized.slice(4);
    candidates.add(national);
    candidates.add(`251${national}`);
    candidates.add(`0${national}`);
    candidates.add(`+251 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`);
    candidates.add(`0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`);
  }

  return [...candidates];
}
