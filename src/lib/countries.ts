export interface CountryInfo {
  code: string;
  name: string;
  region: 'Europe' | 'Amérique' | 'Afrique' | 'Moyen-Orient & Asie' | 'Océanie';
}

export const ALL_COUNTRIES: CountryInfo[] = [
  // Europe
  { code: 'FR', name: 'France', region: 'Europe' },
  { code: 'CH', name: 'Suisse', region: 'Europe' },
  { code: 'BE', name: 'Belgique', region: 'Europe' },
  { code: 'LU', name: 'Luxembourg', region: 'Europe' },
  { code: 'MC', name: 'Monaco', region: 'Europe' },
  { code: 'GB', name: 'Royaume-Uni', region: 'Europe' },
  { code: 'DE', name: 'Allemagne', region: 'Europe' },
  { code: 'IT', name: 'Italie', region: 'Europe' },
  { code: 'ES', name: 'Espagne', region: 'Europe' },
  { code: 'PT', name: 'Portugal', region: 'Europe' },
  { code: 'NL', name: 'Pays-Bas', region: 'Europe' },
  { code: 'IE', name: 'Irlande', region: 'Europe' },
  { code: 'AT', name: 'Autriche', region: 'Europe' },
  { code: 'SE', name: 'Suède', region: 'Europe' },
  { code: 'NO', name: 'Norvège', region: 'Europe' },
  { code: 'DK', name: 'Danemark', region: 'Europe' },
  { code: 'FI', name: 'Finlande', region: 'Europe' },
  { code: 'IS', name: 'Islande', region: 'Europe' },
  { code: 'PL', name: 'Pologne', region: 'Europe' },
  { code: 'CZ', name: 'Tchéquie', region: 'Europe' },
  { code: 'GR', name: 'Grèce', region: 'Europe' },
  { code: 'RO', name: 'Roumanie', region: 'Europe' },
  { code: 'HU', name: 'Hongrie', region: 'Europe' },
  { code: 'HR', name: 'Croatie', region: 'Europe' },
  { code: 'BG', name: 'Bulgarie', region: 'Europe' },
  { code: 'SK', name: 'Slovaquie', region: 'Europe' },
  { code: 'SI', name: 'Slovénie', region: 'Europe' },
  { code: 'EE', name: 'Estonie', region: 'Europe' },
  { code: 'LV', name: 'Lettonie', region: 'Europe' },
  { code: 'LT', name: 'Lituanie', region: 'Europe' },
  { code: 'CY', name: 'Chypre', region: 'Europe' },
  { code: 'MT', name: 'Malte', region: 'Europe' },
  { code: 'AD', name: 'Andorre', region: 'Europe' },
  { code: 'LI', name: 'Liechtenstein', region: 'Europe' },
  { code: 'RS', name: 'Serbie', region: 'Europe' },
  { code: 'UA', name: 'Ukraine', region: 'Europe' },
  { code: 'TR', name: 'Turquie', region: 'Europe' },

  // Amérique
  { code: 'CA', name: 'Canada', region: 'Amérique' },
  { code: 'US', name: 'États-Unis', region: 'Amérique' },
  { code: 'MX', name: 'Mexique', region: 'Amérique' },
  { code: 'BR', name: 'Brésil', region: 'Amérique' },
  { code: 'AR', name: 'Argentine', region: 'Amérique' },
  { code: 'CO', name: 'Colombie', region: 'Amérique' },
  { code: 'CL', name: 'Chili', region: 'Amérique' },
  { code: 'PE', name: 'Pérou', region: 'Amérique' },
  { code: 'PA', name: 'Panama', region: 'Amérique' },
  { code: 'CR', name: 'Costa Rica', region: 'Amérique' },

  // Afrique
  { code: 'BJ', name: 'Bénin', region: 'Afrique' },
  { code: 'CI', name: "Côte d'Ivoire", region: 'Afrique' },
  { code: 'SN', name: 'Sénégal', region: 'Afrique' },
  { code: 'TG', name: 'Togo', region: 'Afrique' },
  { code: 'CM', name: 'Cameroun', region: 'Afrique' },
  { code: 'MA', name: 'Maroc', region: 'Afrique' },
  { code: 'TN', name: 'Tunisie', region: 'Afrique' },
  { code: 'DZ', name: 'Algérie', region: 'Afrique' },
  { code: 'GA', name: 'Gabon', region: 'Afrique' },
  { code: 'CG', name: 'Congo', region: 'Afrique' },
  { code: 'CD', name: 'RD Congo', region: 'Afrique' },
  { code: 'BF', name: 'Burkina Faso', region: 'Afrique' },
  { code: 'ML', name: 'Mali', region: 'Afrique' },
  { code: 'NE', name: 'Niger', region: 'Afrique' },
  { code: 'GN', name: 'Guinée', region: 'Afrique' },
  { code: 'RW', name: 'Rwanda', region: 'Afrique' },
  { code: 'MU', name: 'Maurice', region: 'Afrique' },
  { code: 'NG', name: 'Nigeria', region: 'Afrique' },
  { code: 'GH', name: 'Ghana', region: 'Afrique' },
  { code: 'KE', name: 'Kenya', region: 'Afrique' },
  { code: 'ZA', name: 'Afrique du Sud', region: 'Afrique' },
  { code: 'EG', name: 'Égypte', region: 'Afrique' },

  // Moyen-Orient & Asie
  { code: 'AE', name: 'Émirats Arabes Unis (Dubaï)', region: 'Moyen-Orient & Asie' },
  { code: 'SA', name: 'Arabie Saoudite', region: 'Moyen-Orient & Asie' },
  { code: 'QA', name: 'Qatar', region: 'Moyen-Orient & Asie' },
  { code: 'KW', name: 'Koweït', region: 'Moyen-Orient & Asie' },
  { code: 'LB', name: 'Liban', region: 'Moyen-Orient & Asie' },
  { code: 'IL', name: 'Israël', region: 'Moyen-Orient & Asie' },
  { code: 'SG', name: 'Singapour', region: 'Moyen-Orient & Asie' },
  { code: 'JP', name: 'Japon', region: 'Moyen-Orient & Asie' },
  { code: 'KR', name: 'Corée du Sud', region: 'Moyen-Orient & Asie' },
  { code: 'CN', name: 'Chine', region: 'Moyen-Orient & Asie' },
  { code: 'HK', name: 'Hong Kong', region: 'Moyen-Orient & Asie' },
  { code: 'IN', name: 'Inde', region: 'Moyen-Orient & Asie' },
  { code: 'TH', name: 'Thaïlande', region: 'Moyen-Orient & Asie' },
  { code: 'VN', name: 'Vietnam', region: 'Moyen-Orient & Asie' },
  { code: 'ID', name: 'Indonésie', region: 'Moyen-Orient & Asie' },
  { code: 'MY', name: 'Malaisie', region: 'Moyen-Orient & Asie' },
  { code: 'PH', name: 'Philippines', region: 'Moyen-Orient & Asie' },

  // Océanie
  { code: 'AU', name: 'Australie', region: 'Océanie' },
  { code: 'NZ', name: 'Nouvelle-Zélande', region: 'Océanie' },
];

export function resolveIso2Code(input: string | null | undefined): string {
  if (!input) return 'FR';
  const clean = input.trim().toUpperCase();
  if (clean === 'UK') return 'GB';

  const byCode = ALL_COUNTRIES.find((c) => c.code === clean);
  if (byCode) return byCode.code;

  const lower = input.trim().toLowerCase();
  const byName = ALL_COUNTRIES.find((c) => c.name.toLowerCase() === lower);
  if (byName) return byName.code;

  return clean.slice(0, 2);
}

export function getCountryByCode(input: string | null | undefined): CountryInfo {
  const code = resolveIso2Code(input);
  return (
    ALL_COUNTRIES.find((c) => c.code === code) || {
      code,
      name: code,
      region: 'Europe',
    }
  );
}

export function getFlagImageUrl(input: string | null | undefined): string {
  const iso2 = resolveIso2Code(input).toLowerCase();
  return `https://flagcdn.com/w40/${iso2}.png`;
}

