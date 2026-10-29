import { ContractError, toCustomerOpportunity } from './contracts.js';

const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim().length > 0;

export function validateResearch(data) {
  if (!record(data)) throw new ContractError('Onderzoek moet een JSON-object zijn.', 'INVALID_SHAPE');
  if (data.schema !== 'ximo-research' || data.version !== 1) {
    throw new ContractError('Verwacht onderzoek met schema ximo-research, versie 1.', 'UNSUPPORTED_RESEARCH');
  }
  if (!text(data.company) || !Array.isArray(data.opportunities)) {
    throw new ContractError('Bedrijfsnaam of kansenlijst ontbreekt.', 'INVALID_RESEARCH');
  }
  const opportunities = data.opportunities.map((item, index) => normalizeOpportunity(item, index));
  return { company: data.company.trim(), website: text(data.website) ? data.website.trim() : '',
    summary: text(data.summary) ? data.summary.trim() : '', opportunities, original: data };
}

export function normalizeOpportunity(item, index = 0) {
  if (!record(item) || !text(item.title)) throw new ContractError('Elke kans moet een titel hebben.', 'INVALID_OPPORTUNITY');
  return {
    id: text(item.id) ? item.id.trim() : 'opportunity-' + (index + 1),
    title: item.title.trim(),
    painPoint: text(item.painPoint) ? item.painPoint.trim() : '',
    benefits: text(item.benefits) ? item.benefits.trim() : '',
    impactSummary: text(item.impactSummary) ? item.impactSummary.trim() : '',
    feasibilitySummary: text(item.feasibilitySummary) ? item.feasibilitySummary.trim() : '',
    confidence: text(item.confidence) ? item.confidence.trim() : 'Te verifiëren',
    verificationNote: text(item.verificationNote) ? item.verificationNote.trim() : '',
    internalSolution: text(item.internalSolution) ? item.internalSolution.trim() : '',
    sourceRefs: Array.isArray(item.sourceRefs) ? item.sourceRefs.filter(text) : [],
    selected: item.selected !== false
  };
}

export function checkOpportunities(items) {
  const selected = items.filter(x => x.selected);
  const ids = items.map(x => x.id);
  const errors = [];
  const warnings = [];
  if (new Set(ids).size !== ids.length) errors.push('Kans-ID’s moeten uniek zijn.');
  if (selected.length < 3 || selected.length > 5) errors.push('Selecteer 3 tot 5 kansen.');
  for (const item of selected) {
    if (!text(item.title)) errors.push('Een geselecteerde kans mist een titel.');
    if (!text(item.painPoint) || !text(item.benefits)) warnings.push('Vul pijnpunt en voordeel aan bij: ' + item.title);
    if (!item.sourceRefs?.length) warnings.push('Geen bronverwijzing bij: ' + item.title);
  }
  return { errors, warnings, selected };
}

export function customerOpportunities(items) {
  return items.filter(x => x.selected).map(x => toCustomerOpportunity(x));
}

export function researchPrompt(company, website) {
  if (!text(company) || !text(website)) throw new Error('Bedrijfsnaam en website zijn vereist.');
  const example = {
    schema: 'ximo-research', version: 1, company: company.trim(), website: website.trim(),
    summary: 'Onderbouwde samenvatting van bedrijf, markt en concurrentie, met bronverwijzingen en onzekerheden.',
    opportunities: [{
      id: 'k1', title: 'Korte naam van de kans',
      painPoint: 'Mogelijk pijnpunt; benoem expliciet wanneer dit een hypothese is',
      benefits: 'Verwachte kwalitatieve voordelen',
      impactSummary: 'Kwalitatieve impact zonder financiële bedragen',
      feasibilitySummary: 'Globale haalbaarheid en randvoorwaarden',
      confidence: 'Brongebaseerd of hypothese',
      verificationNote: 'Wat bij de klant moet worden geverifieerd',
      sourceRefs: ['https://voorbeeld.nl/bron'],
      internalSolution: 'Uitsluitend intern: mogelijke oplossingsrichting'
    }]
  };
  return [
    'Je bent een onafhankelijke bedrijfs- en marktanalist voor Ximo Solutions. Voer diepgaand extern onderzoek uit naar ' + company.trim() + '. De opgegeven bedrijfswebsite (' + website.trim() + ') is slechts het STARTPUNT, niet de enige bron.',
    '',
    'ONDERZOEKSAANPAK (verplicht):',
    '1. Onderzoek de bedrijfswebsite voor activiteiten, diensten, klanten, positionering en concrete feiten.',
    '2. Zoek DAARNAAST actief naar onafhankelijke externe bronnen: brancheorganisaties, sectorrapporten, nieuwsmedia, openbare registers, vakpublicaties, concurrentiewebsites en relevante publieke bedrijfsprofielen.',
    '3. Onderzoek de Nederlandse markt en actuele ontwikkelingen in de relevante branche, inclusief digitalisering, automatisering, AI, regelgeving en operationele uitdagingen waar toepasselijk.',
    '4. Identificeer relevante concurrenten of vergelijkbare bedrijven en vergelijk hun openbare positionering, dienstverlening en digitaliseringssignalen. Doe geen ongefundeerde claims over hun interne processen.',
    '5. Verbind marktinzichten aan 5 tot 8 relevante AI- en automatiseringskansen. Rangschik op verwachte waarde en haalbaarheid. Formuleer pijnpunten als hypothese tenzij er direct bewijs is.',
    '6. Controleer meerdere bronnen waar mogelijk. Geef per kans concrete, controleerbare URL-verwijzingen in sourceRefs; verzin nooit bronnen of URL’s. Als externe bronnen ontbreken, vermeld dat duidelijk en verlaag de zekerheid.',
    '7. Maak expliciet onderscheid tussen geverifieerde feiten, redelijke afleidingen en aannames die tijdens een klantgesprek geverifieerd moeten worden. Verzin geen interne bedrijfsgegevens, tools, personeelsaantallen, budgetten, besparingen of ROI.',
    '',
    'UITVOER: maak een echt downloadbaar UTF-8 JSON-bestand aan, niet alleen een JSON-antwoord in de chat.',
    'Bestandsnaam: JJJJMMDD - KLANTNAAM - ximo-research.json. Gebruik de WERKELIJKE datum waarop je het bestand maakt (YYYYMMDD, acht cijfers), gevolgd door spatie-streepje-spatie en de opgegeven bedrijfsnaam. Maak uitsluitend ongeldige bestandsnaamtekens veilig. Voorbeeld van de naamopbouw: 20261029 - Isorama BV - ximo-research.json. Het voorbeeld is GEEN vaste datum.',
    'Gebruik exact het onderstaande JSON-contract met 5 tot 8 volledige kansen, unieke IDs en zonder extra tekst buiten het bestand:',
    JSON.stringify(example, null, 2),
    'Vul summary met een bondige maar inhoudelijke synthese van bedrijf, markt, concurrenten, relevante trends, onzekerheden en bronnen. Vul alle kansvelden betekenisvol in; gebruik echte bron-URL’s in sourceRefs waar beschikbaar.',
    'Bied het bestand direct als downloadbare bijlage/link aan. Geen markdown-codeblok, JSONL of ZIP. Als je geen bestand kunt aanmaken, zeg dat expliciet en geef het volledige geldige JSON-object als terugvaloptie.'
  ].join('\n');
}
