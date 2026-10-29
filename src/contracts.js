// Ximo Quickscan: versioned, defensive input contracts.
// This module contains no storage, network calls or browser dependencies.

export class ContractError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ContractError';
    this.code = code;
  }
}

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasText = value => typeof value === 'string' && value.trim().length > 0;

function requireRecord(value, label) {
  if (!isRecord(value)) throw new ContractError(label + ' moet een JSON-object zijn.', 'INVALID_SHAPE');
}

export function parseJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw new ContractError('Geen JSON-inhoud ontvangen.', 'EMPTY_INPUT');
  try {
    return JSON.parse(text);
  } catch {
    throw new ContractError('Het bestand bevat geen geldige JSON.', 'INVALID_JSON');
  }
}

export function validateInventory(input) {
  requireRecord(input, 'Inventarisatie');
  if (input.schema !== 'ximo-inventarisatie') {
    throw new ContractError('Dit is geen Ximo Inventarisatie-export.', 'WRONG_SCHEMA');
  }
  if (input.version !== 1) {
    throw new ContractError('Deze inventarisatieversie wordt nog niet ondersteund.', 'UNSUPPORTED_VERSION');
  }
  requireRecord(input.values, 'Inventarisatie.values');
  if (!Array.isArray(input.visited)) {
    throw new ContractError('Inventarisatie.visited ontbreekt of is ongeldig.', 'INVALID_SHAPE');
  }
  if (!hasText(input.values.company)) {
    throw new ContractError('De bedrijfsnaam ontbreekt in de inventarisatie.', 'MISSING_COMPANY');
  }
  // Never mutate original customer data; preserve unknown optional fields.
  return { kind: 'inventory', schema: input.schema, version: 1, company: input.values.company.trim(), original: input };
}

export function normalizeCompany(value) {
  if (!hasText(value)) return '';
  return value.toLocaleLowerCase('nl-NL')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(b\.?v\.?|besloten vennootschap|holding)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function compareCompanyNames(a, b) {
  const left = normalizeCompany(a);
  const right = normalizeCompany(b);
  if (!left || !right) return { status: 'uncertain', reason: 'Bedrijfsnaam ontbreekt.' };
  if (left === right) return { status: 'match', reason: 'Bedrijfsnamen komen overeen.' };
  // Name mismatch alone is NOT a hard block: trade names can differ.
  return { status: 'uncertain', reason: 'Bedrijfsnamen verschillen; controleer handelsnaam en website.' };
}

export const CHAPTERS = Object.freeze([
  'Bedrijf & uitgangssituatie',
  'Markt & ontwikkelingen',
  'Kansen & mogelijke pijnpunten',
  'Belangrijkste AI-kansen',
  'Impact & haalbaarheid',
  'Vervolg & gesprek'
]);

export const CUSTOMER_FIELDS = Object.freeze([
  'id', 'title', 'priority', 'painPoint', 'benefits', 'impactSummary',
  'feasibilitySummary', 'confidence', 'verificationNote', 'financialRange',
  'solution', 'example', 'processSteps', 'validationQuestions', 'kpis', 'scores'
]);

export function toCustomerOpportunity(opportunity) {
  requireRecord(opportunity, 'AI-kans');
  const result = {};
  for (const key of CUSTOMER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(opportunity, key)) {
      result[key] = opportunity[key];
    }
  }
  return result;
}
