import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const FCFA_RATE = 655.957;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function eurToFcfa(amountEur: number): number {
  return Math.round((Number(amountEur) || 0) * FCFA_RATE);
}

export function formatEur(amountEur: number, decimals = 0): string {
  const val = Number(amountEur) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatFcfa(amountEur: number): string {
  const fcfa = eurToFcfa(amountEur);
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(fcfa)} FCFA`;
}

export function formatDualCurrency(amountEur: number, decimals = 0): {
  eur: string;
  fcfa: string;
  combined: string;
} {
  const eur = formatEur(amountEur, decimals);
  const fcfa = formatFcfa(amountEur);
  return {
    eur,
    fcfa,
    combined: `${eur} (${fcfa})`,
  };
}

export function normalizeCountryCode(country: string): string {
  const map: Record<string, string> = {
    france: 'FR',
    fr: 'FR',
    belgique: 'BE',
    belgium: 'BE',
    be: 'BE',
    suisse: 'CH',
    switzerland: 'CH',
    ch: 'CH',
    'royaume-uni': 'UK',
    uk: 'UK',
    gb: 'UK',
    luxembourg: 'LU',
    lu: 'LU',
    allemagne: 'DE',
    germany: 'DE',
    de: 'DE',
    espagne: 'ES',
    spain: 'ES',
    es: 'ES',
    italie: 'IT',
    italy: 'IT',
    it: 'IT',
    'pays-bas': 'NL',
    netherlands: 'NL',
    nl: 'NL',
  };
  const key = (country || 'FR').trim().toLowerCase();
  return map[key] || country.toUpperCase().slice(0, 3);
}

export function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 0;
  const diffMs = Date.now() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function hoursUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  // Set end of day if date-only string
  if (dateStr.length === 10) {
    target.setHours(23, 59, 59, 999);
  }
  const diffMs = target.getTime() - Date.now();
  return Math.round(diffMs / (1000 * 60 * 60));
}

export function getVideoPreviewUrl(driveFileId: string): string {
  if (driveFileId.startsWith('http')) return driveFileId;
  return `https://drive.google.com/file/d/${driveFileId}/preview`;
}

export function getImagePreviewUrl(driveFileId: string): string {
  if (driveFileId.startsWith('http') || driveFileId.startsWith('data:')) {
    return driveFileId;
  }
  return `https://lh3.googleusercontent.com/d/${driveFileId}`;
}

