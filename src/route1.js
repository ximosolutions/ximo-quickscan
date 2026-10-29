import { ContractError, toCustomerOpportunity } from './contracts.js';

const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim().length > 0;

export function validateResearch(data) {
  if (!record(data)) throw new ContractError('Onderzoek moet een JSON-object zijn.', 'INVALID_SHAPE');
  if (data.schema !== 'ximo-research' || ![1, 2].includes(data.version)) {
    throw new ContractError('Verwacht onderzoek met schema ximo-research, versie 1 of 2.', 'UNSUPPORTED_RESEARCH');
  }
  if (!text(data.company) || !Array.isArray(data.opportunities)) {
    throw new ContractError('Bedrijfsnaam of kansenlijst ontbreekt.', 'INVALID_RESEARCH');
  }
  const opportunities = data.opportunities.map((item, index) => normalizeOpportunity(item, index));
  return { company: data.company.trim(), website: text(data.website) ? data.website.trim() : '',
    summary: text(data.summary) ? data.summary.trim() : '', market: Array.isArray(data.market) ? data.market : [], competitors: Array.isArray(data.competitors) ? data.competitors : [], sources: Array.isArray(data.sources) ? data.sources : [], opportunities, original: data };
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
    evidenceType: text(item.evidenceType) ? item.evidenceType.trim() : 'hypothese',
    scores: record(item.scores) ? item.scores : {},
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
    if (item.evidenceType === 'hypothese') warnings.push('Hypothese, nog niet bevestigd: ' + item.title);
  }
  return { errors, warnings, selected };
}

export function customerOpportunities(items) {
  return items.filter(x => x.selected).map(x => toCustomerOpportunity(x));
}

export function researchPrompt(company, website) {
  if (!text(company) || !text(website)) throw new Error('Bedrijfsnaam en website zijn vereist.');
  const example = {
    schema:'ximo-research',version:2,company:company.trim(),website:website.trim(),
    summary:'Beknopte synthese met feiten, aannames en beperkingen',
    market:[{trend:'Relevante brancheontwikkeling',evidenceType:'feit',sourceRefs:['https://bron.example/onderzoek']}],
    competitors:[{name:'Vergelijkbaar bedrijf',comparison:'Controleerbaar publiek verschil',sourceRefs:['https://bron.example/concurrent']}],
    sources:[{url:'https://bron.example/onderzoek',title:'Titel',publisher:'Uitgever',accessedOn:'YYYY-MM-DD'}],
    opportunities:[{id:'k1',title:'Kans',painPoint:'Hypothese over pijnpunt',benefits:'Kwalitatieve voordelen',
      impactSummary:'Kwalitatieve impact, geen bedragen',feasibilitySummary:'Haalbaarheid en randvoorwaarden',
      confidence:'middel',evidenceType:'hypothese',verificationNote:'Concrete vraag voor klantgesprek',
      sourceRefs:['https://bron.example/onderzoek'],internalSolution:'Alleen intern: oplossingsrichting',
      scores:{relevance:3,impact:3,feasibility:3,evidence:2}}]
  };
  return [
    'XIMO RESEARCH ENGINE V1 — onafhankelijk bedrijfs-, markt- en concurrentieonderzoek.',
    'Doelbedrijf: '+company.trim()+'. Bedrijfswebsite: '+website.trim()+'. De bedrijfswebsite is uitsluitend het STARTPUNT.',
    '',
    'Werk in deze volgorde; formuleer pas kansen nadat de eerste twee fasen zijn afgerond:',
    'FASE 1 — BEDRIJF: controleer activiteiten, doelgroep, diensten en positionering via de eigen website en waar mogelijk onafhankelijke bronnen. Verzin geen interne processen.',
    'FASE 2 — MARKT EN CONCURRENTIE: zoek actief buiten de eigen website naar brancheorganisaties, vakmedia, sectorrapporten, nieuws, openbare registers en concurrenten. Onderzoek trends in Nederland, digitalisering, AI, regelgeving en aantoonbare ontwikkelingen. Vermeld relevante concurrenten met concrete vergelijkingspunten. Als externe bronnen niet beschikbaar zijn, zeg dat expliciet.',
    'FASE 3 — PIJNPUNTEN: onderscheid per signaal feit (direct verifieerbaar), afleiding (redelijk onderbouwd) en hypothese (nog onbevestigd). Presenteer mogelijke interne knelpunten nooit als vaststaande feiten.',
    'FASE 4 — KANSEN: formuleer maximaal 8, bij voorkeur 5–8, maar verzin geen extra kansen om een minimum te halen. Vermijd generieke chatbot- of automatiseringsideeën zonder aantoonbare relatie met de context. Geef per kans: aanleiding, pijnpunt, voordeel, haalbaarheid, bronverwijzingen, interne oplossingsrichting en een concrete verificatievraag voor het verkoopgesprek.',
    'FASE 5 — PRIORITERING: score relevantie, impact, haalbaarheid en bewijssterkte elk van 1 tot 5. Dit zijn onderbouwde kwalitatieve inschattingen, geen meetresultaten. Rangschik de kansen op verwachte waarde, haalbaarheid en bewijssterkte; vermeld belangrijke onzekerheden.',
    '',
    'BRONNEN EN BETROUWBAARHEID: gebruik echte, controleerbare URL’s; verzin nooit URL’s, citaten of feiten. Gebruik waar mogelijk meerdere onafhankelijke bronnen. Een eigen bedrijfswebsite telt niet als onafhankelijke bron. Maak zichtbaar wanneer bronnen ontbreken of tegenstrijdig zijn. Als je geen internettoegang hebt, meld dat en doe geen alsof-onderzoek.',
    'PRIVACY EN FINANCIËN: gebruik alleen openbare informatie, geen verzonnen klantinterne feiten, financiële bedragen, besparingen of ROI. Geef geen concrete technische implementatiedetails in klantgerichte tekst; internalSolution is uitsluitend voor intern gebruik.',
    '',
    'BESTAND: maak daadwerkelijk een downloadbaar UTF-8 JSON-bestand als bijlage, niet alleen een codeblok. Bestandsnaam: JJJJMMDD - '+company.trim()+' - ximo-research.json. Gebruik de ECHTE aanmaakdatum in YYYYMMDD, niet een voorbeelddatum. Vervang ongeldige bestandsnaamtekens veilig.',
    'JSON-CONTRACT: lever een geldig JSON-object volgens dit schema (version 2). Vul alle onderdelen inhoudelijk in; neem alle gevonden bronnen op in sources. Gebruik unieke kans-IDs en voor scores alleen gehele getallen 1–5. Voor evidenceType gebruik feit, afleiding of hypothese:',
    JSON.stringify(example,null,2),
    'Geef alleen een korte bevestiging en een downloadlink naar het bestand. Geen ZIP, JSONL of markdown-codeblok. Als bestandsgeneratie niet mogelijk is, meld dat expliciet en geef het volledige JSON-object als terugvaloptie.'
  ].join('\n');
}
