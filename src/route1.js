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
  if (!opportunities.length) throw new ContractError('Het onderzoek bevat geen AI-kansen.', 'EMPTY_OPPORTUNITIES');
  const ids=opportunities.map(item=>item.id);
  if (new Set(ids).size!==ids.length) throw new ContractError('Het onderzoek bevat dubbele kans-ID’s.', 'DUPLICATE_OPPORTUNITIES');
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
    scores: normalizeScores(item.scores),
    selected: item.selected !== false
  };
}

const SCORE_KEYS=['relevance','impact','feasibility','evidence'];
function normalizeScores(value) {
  const result={};
  if (!record(value)) return result;
  for (const key of SCORE_KEYS) {
    const score=value[key];
    if (Number.isInteger(score)&&score>=1&&score<=5) result[key]=score;
  }
  return result;
}
export function researchQuality(research) {
  const issues=[];
  const sources=Array.isArray(research?.sources)?research.sources:[];
  const urls=new Set(sources.map(s=>typeof s==='string'?s:s?.url).filter(x=>typeof x==='string'&&/^https?:\/\//i.test(x)));
  const opportunities=Array.isArray(research?.opportunities)?research.opportunities:[];
  const market=Array.isArray(research?.market)?research.market:[];
  const competitors=Array.isArray(research?.competitors)?research.competitors:[];
  if (!research?.summary) issues.push('Bedrijfssamenvatting ontbreekt.');
  if (!market.length) issues.push('Er zijn geen marktontwikkelingen aangeleverd.');
  if (!competitors.length) issues.push('Er zijn geen concurrentievergelijkingen aangeleverd.');
  if (!urls.size) issues.push('Geen controleerbare bron-URL’s in de bronnenlijst.');
  const linked=opportunities.filter(op=>op.sourceRefs?.some(ref=>urls.has(ref)));
  if (opportunities.length && linked.length<opportunities.length) issues.push((opportunities.length-linked.length)+' kansen hebben geen bron die terugkomt in de bronnenlijst.');
  const scored=opportunities.filter(op=>SCORE_KEYS.every(key=>Number.isInteger(op.scores?.[key])));
  if (opportunities.length && scored.length<opportunities.length) issues.push((opportunities.length-scored.length)+' kansen missen één of meer geldige prioriteitsscores (1–5).');
  const independent=sources.filter(source=>record(source)&&source.independent===true).length;
  return {issues,sourceCount:urls.size,marketCount:market.length,competitorCount:competitors.length,opportunityCount:opportunities.length,scoredCount:scored.length,linkedCount:linked.length,independentConfirmedCount:independent};
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
    if (SCORE_KEYS.some(key=>!Number.isInteger(item.scores?.[key]))) warnings.push('Onvolledige prioriteitsscores bij: '+item.title);
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
    sources:[{url:'https://bron.example/onderzoek',title:'Titel',publisher:'Uitgever',accessedOn:'YYYY-MM-DD',independent:true}],
    opportunities:[{id:'k1',title:'Kans',painPoint:'Hypothese over pijnpunt',benefits:'Kwalitatieve voordelen',
      impactSummary:'Kwalitatieve impact, geen bedragen',feasibilitySummary:'Haalbaarheid en randvoorwaarden',
      confidence:'middel',evidenceType:'hypothese',verificationNote:'Concrete vraag voor klantgesprek',
      sourceRefs:['https://bron.example/onderzoek'],internalSolution:'Alleen intern: oplossingsrichting',
      scores:{relevance:3,impact:3,feasibility:3,evidence:2}}]
  };
  return [
    'XIMO RESEARCH ENGINE V2 — onafhankelijk bedrijfs-, markt- en concurrentieonderzoek.',
    'Doelbedrijf: '+company.trim()+'. Bedrijfswebsite: '+website.trim()+'. De bedrijfswebsite is uitsluitend het STARTPUNT.',
    '',
    'Werk in deze volgorde; formuleer pas kansen nadat de eerste twee fasen zijn afgerond:',
    'FASE 1 — BEDRIJF: controleer activiteiten, doelgroep, diensten en positionering via de eigen website en waar mogelijk onafhankelijke bronnen. Verzin geen interne processen.',
    'FASE 2 — MARKT EN CONCURRENTIE: zoek actief buiten de eigen website naar brancheorganisaties, vakmedia, sectorrapporten, nieuws, openbare registers en concurrenten. Onderzoek trends in Nederland, digitalisering, AI, regelgeving en aantoonbare ontwikkelingen. Vermeld relevante concurrenten met concrete vergelijkingspunten. Als externe bronnen niet beschikbaar zijn, zeg dat expliciet.',
    'FASE 3 — PIJNPUNTEN: onderscheid per signaal feit (direct verifieerbaar), afleiding (redelijk onderbouwd) en hypothese (nog onbevestigd). Presenteer mogelijke interne knelpunten nooit als vaststaande feiten.',
    'FASE 4 — KANSEN: formuleer maximaal 8, bij voorkeur 5–8, maar verzin geen extra kansen om een minimum te halen. Vermijd generieke chatbot- of automatiseringsideeën zonder aantoonbare relatie met de context. Geef per kans: aanleiding, pijnpunt, voordeel, haalbaarheid, bronverwijzingen, interne oplossingsrichting en een concrete verificatievraag voor het verkoopgesprek.',
    'FASE 5 — PRIORITERING: score relevantie, impact, haalbaarheid en bewijssterkte elk van 1 tot 5. Dit zijn onderbouwde kwalitatieve inschattingen, geen meetresultaten. Rangschik de kansen op verwachte waarde, haalbaarheid en bewijssterkte; vermeld belangrijke onzekerheden.',
    '',
    'VERPLICHTE CONTROLES: controleer of iedere genoemde bron echt bestaat, de specifieke claim ondersteunt en terugkomt in sources. Geef bronverwijzingen als exacte URL die ook in sources staat. Noem publicatiedatum en geraadpleegde datum waar mogelijk. Een website die alleen de bedrijfsnaam noemt is geen bewijs voor een intern pijnpunt. Label onafhankelijke bronnen expliciet met independent:true, alleen wanneer dit aantoonbaar klopt.',
    'ANTI-HALLUCINATIE: als een gegeven niet te verifiëren is, laat het onbekend en formuleer een verificatievraag. Geen verzonnen concurrenten, trends, percentages, klantproblemen, automatiseringspotentieel of financiële resultaten. Gebruik geen fictieve voorbeeldbronnen uit het JSON-schema.',
    'RELEVANTIE: laat per kans concreet zien welk openbaar bedrijfssignaal en welke sectorontwikkeling de kans ondersteunen. Geef voor elke score een korte motivatie in impactSummary of feasibilitySummary. Selecteer alleen kansen die logisch voortkomen uit het onderzoek; voorkom overlap tussen kansen.',
    'BRONNEN EN BETROUWBAARHEID: gebruik echte, controleerbare URL’s; verzin nooit URL’s, citaten of feiten. Gebruik waar mogelijk meerdere onafhankelijke bronnen. Een eigen bedrijfswebsite telt niet als onafhankelijke bron. Maak zichtbaar wanneer bronnen ontbreken of tegenstrijdig zijn. Als je geen internettoegang hebt, meld dat en doe geen alsof-onderzoek.',
    'PRIVACY EN FINANCIËN: gebruik alleen openbare informatie, geen verzonnen klantinterne feiten, financiële bedragen, besparingen of ROI. Geef geen concrete technische implementatiedetails in klantgerichte tekst; internalSolution is uitsluitend voor intern gebruik.',
    '',
    'BESTAND: maak daadwerkelijk een downloadbaar UTF-8 JSON-bestand als bijlage, niet alleen een codeblok. Gebruik voor de ECHTE bestandsnaam op schijf het URL-veilige patroon JJJJMMDD-'+company.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'')+'-ximo-research.json (geen spaties, geen %20). Gebruik de ECHTE aanmaakdatum in YYYYMMDD, niet een voorbeelddatum. Controleer dat het fysieke bestand daadwerkelijk eindigt op .json; wijzig niet alleen de zichtbare linktekst. De inhoud moet valide JSON zijn.',
    'JSON-CONTRACT: lever een geldig JSON-object volgens dit schema (version 2). Vul alle onderdelen inhoudelijk in; neem alle gevonden bronnen op in sources. Gebruik unieke kans-IDs en voor scores alleen gehele getallen 1–5. Voor evidenceType gebruik feit, afleiding of hypothese:',
    JSON.stringify(example,null,2),
    'Geef alleen een korte bevestiging en een downloadlink naar het bestand. Geen ZIP, JSONL of markdown-codeblok. Als bestandsgeneratie niet mogelijk is, meld dat expliciet en geef het volledige JSON-object als terugvaloptie.'
  ].join('\n');
}
