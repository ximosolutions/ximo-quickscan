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
  return `Onderzoek het bedrijf ${company} (website: ${website}) op basis van publiek beschikbare bronnen. Maak onderscheid tussen controleerbare feiten, hypotheses en te verifiëren aannames. Geef een brede lijst van 5 tot 8 concrete AI- en automatiseringskansen op basis van mogelijke pijnpunten en verwachte voordelen. Verzín geen interne bedrijfsfeiten of financiële bedragen. Lever UITSLUITEND een geldig JSON-object met exact deze basisstructuur: {"schema":"ximo-research","version":1,"company":"${company}","website":"${website}","summary":"korte onderbouwde context","opportunities":[{"id":"k1","title":"kans","painPoint":"mogelijk pijnpunt","benefits":"verwachte voordelen","impactSummary":"kwalitatieve impact","feasibilitySummary":"globale haalbaarheid","confidence":"hypothese of brongebaseerd","verificationNote":"wat bij klant verifiëren","sourceRefs":["bron URL of duidelijke verwijzing"],"internalSolution":"alleen intern, hoog-over mogelijke oplossingsrichting"}]}. Gebruik voor alle kansen unieke IDs. Maak daadwerkelijk een downloadbaar UTF-8 JSON-bestand aan met de bestandsnaam ximo-research.json en bied dit als bestand/bijlage aan, zodat ik het direct kan downloaden en in Ximo Quickscan kan importeren. Schrijf het volledige geldige JSON-object naar dat bestand (geen JSONL, geen ZIP, geen markdown). Toon daarnaast hooguit een korte bevestiging met de downloadlink. Als je geen bestand kunt aanmaken, meld dat expliciet en geef het volledige JSON-object zonder markdown-codeblok als terugvaloptie.`;
}
