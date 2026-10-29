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
export function opportunityPriority(item) {
  const scores=item?.scores||{};
  const weights={relevance:0.35,impact:0.30,feasibility:0.20,evidence:0.15};
  const keys=Object.keys(weights);
  const complete=keys.every(key=>Number.isInteger(scores[key])&&scores[key]>=1&&scores[key]<=5);
  if (!complete) return {score:null,complete:false,label:'Niet beoordeeld'};
  const score=Math.round(keys.reduce((total,key)=>total+scores[key]*weights[key],0)*20);
  return {score,complete:true,label:score>=80?'Hoge prioriteit':score>=60?'Middelgrote prioriteit':'Verkennen'};
}
export function prioritizeOpportunities(items) {
  return items.map((item,index)=>({item,index,priority:opportunityPriority(item)}))
    .sort((a,b)=>(b.priority.score??-1)-(a.priority.score??-1)||a.index-b.index)
    .map(({item},index)=>({...item,selected:index<5}));
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
export function opportunityQuality(item, research) {
  const issues=[];
  const sourceUrls=new Set((research?.sources||[]).map(s=>typeof s==='string'?s:s?.url).filter(x=>typeof x==='string'&&/^https?:\/\//i.test(x)));
  const refs=Array.isArray(item.sourceRefs)?item.sourceRefs:[];
  const linked=refs.filter(ref=>sourceUrls.has(ref)).length;
  if (!item.painPoint?.trim()) issues.push('Mogelijk pijnpunt ontbreekt.');
  if (!item.benefits?.trim()) issues.push('Verwacht voordeel ontbreekt.');
  if (!item.verificationNote?.trim()) issues.push('Verificatievraag ontbreekt.');
  if (!refs.length) issues.push('Geen bronverwijzingen.');
  else if (!linked) issues.push('Geen bron gekoppeld aan de bronnenlijst.');
  if (['hypothese','afleiding'].includes(item.evidenceType)) issues.push('Nog niet als bedrijfsfeit bevestigd.');
  if (['relevance','impact','feasibility','evidence'].some(key=>!Number.isInteger(item.scores?.[key]))) issues.push('Prioriteitsscores onvolledig.');
  const incomplete=!item.painPoint?.trim()||!item.benefits?.trim()||!item.verificationNote?.trim()||!refs.length;
  return {status:incomplete?'Onvoldoende informatie':issues.length?'Verificatie nodig':'Gegevens aanwezig',issues,linkedSources:linked,sourceCount:refs.length};
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
    'XIMO RESEARCH ENGINE V3 — DIEPGAAND ONDERZOEK | LEES EERST DEZE INSTRUCTIES.',
    'BEDRIJF: '+company.trim()+' | WEBSITE: '+website.trim(),
    '',
    'EINDRESULTAAT: lever een daadwerkelijk downloadbaar, valide UTF-8 JSON-bestand. De bestandsnaam MOET per uitvoering nieuw zijn: YYYYMMDD-HHMMSS-BEDRIJF-ximo-research-XXXXXX.json. YYYYMMDD = echte aanmaakdatum; HHMMSS = echte aanmaaktijd tot op seconden (24 uur); XXXXXX = nieuwe willekeurige reeks van zes kleine letters/cijfers. Gebruik als BEDRIJF: '+(company.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase())+'. Voorbeeldvorm: 20261029-143527-bedrijf-ximo-research-a7k2p9.json (dit is GEEN vaste bestandsnaam). Maak het bestand fysiek met die naam aan, gebruik geen oude bijlage of bestandslink, en controleer dat de download werkt. Als je de actuele klok niet kunt bepalen: gebruik een unieke UUID en vermeld dat. Als bestanden niet gegenereerd kunnen worden: geef het COMPLETE JSON-object in één codeblok als fallback; beweer nooit dat er een bestand is gemaakt als dat niet zo is.',
    '',
    'DOEL: lever grondig, bedrijfsspecifiek extern deskresearch op als basis voor een kwalitatief adviesgesprek over AI en automatisering. Onderzoek eerst, bedenk pas daarna kansen. Geef voorrang aan kwaliteit, concrete aanknopingspunten en verifieerbare signalen boven snelheid en algemene ideeën.',
    'WERKWIJZE: gebruik indien beschikbaar actief webonderzoek, open pagina’s en controleer inhoud en publicatiedatum. Raadpleeg niet uitsluitend zoekresultaatsnippets. Start met de bedrijfswebsite, maar zoek ook actief buiten de website. Controleer bij twijfel of gevonden informatie werkelijk over het juiste bedrijf gaat. Maak nooit bronnen of webtoegang na.',
    'ONDERZOEK 1 — BEDRIJF: bekijk relevante pagina’s over diensten/producten, branches, doelgroepen, vestigingen, contactkanalen, vacatures, nieuws, cases, werkwijze, software/platformen en partners. Leg concrete openbare signalen vast. Als iets niet openbaar te vinden is, zeg dat. Leid geen interne problemen af als feiten.',
    'ONDERZOEK 2 — MARKT: onderzoek minstens vijf relevante zoekrichtingen indien bronnen beschikbaar zijn: (a) sectortrends, (b) administratieve/operationele knelpunten in de branche, (c) klantverwachtingen en communicatie, (d) digitalisering en praktische AI-toepassingen, (e) regelgeving en risico’s. Geef prioriteit aan Nederlandse en recente informatie, maar gebruik oudere primaire bronnen waar passend. Onderbouw iedere trend met een directe URL.',
    'ONDERZOEK 3 — CONCURRENTEN EN VERGELIJKBARE BEDRIJVEN: identificeer waar mogelijk 3–5 echte relevante partijen; beschrijf per partij een aantoonbaar publiek vergelijkingspunt (bijvoorbeeld online intake, selfservice, klantportaal, automatisering of dienstverlening). Verzin geen verschillen of interne systemen. Als geen betrouwbare vergelijking mogelijk is, lever minder partijen en leg de beperking uit.',
    'ONDERZOEK 4 — SIGNALEN EN KANSEN: verbind concrete bedrijfssignalen aan brancheontwikkelingen. Zoek naar kansen rondom communicatie, klantcontact, offerte- en orderstromen, planning, administratie, kennisbeheer, documentverwerking, rapportage en procesoverdracht, maar neem alleen toepasselijke thema’s op. Onderzoek ook minder voor de hand liggende kansen. Vermijd standaardchatbots zonder specifieke aanleiding.',
    'ONDERZOEK 5 — SELECTIE: lever bij voorkeur 6–8 inhoudelijk verschillende kansen, maximaal 8. Alleen minder wanneer bewijs of relevantie tekortschiet. Elke kans bevat een specifieke aanleiding, concreet mogelijk pijnpunt, beoogd resultaat, kwalitatieve impact, haalbaarheid/randvoorwaarden, intern oplossingsidee, verificatievraag en directe bronverwijzingen. Maak expliciet onderscheid tussen feit, afleiding en hypothese. Gebruik geen verzonnen besparingspercentages, ROI, volumes of interne procesbeschrijvingen.',
    'ONDERZOEK 6 — PRIORITERING: ken per kans gehele scores 1–5 toe voor relevance, impact, feasibility en evidence. Weeg de mate van onderbouwing expliciet mee: een aannemelijke hypothese krijgt geen hoge bewijssterktescore zonder direct bewijs. Licht de scorekeuzes kort toe in impactSummary en feasibilitySummary. Rangschik inhoudelijk op waarde en onderbouwing; geen geforceerde gelijke scores.',
    '',
    'BRONNENKWALITEIT: gebruik zoveel mogelijk verschillende primaire en onafhankelijke bronnen. Streef naar minstens 8–12 relevante, daadwerkelijk geraadpleegde URL’s wanneer die bestaan en toegankelijk zijn; dit is een streefgetal, geen reden om bronnen te verzinnen. Vermeld in sources de echte URL, titel, uitgever, geraadpleegde datum en independent:true uitsluitend voor aantoonbaar onafhankelijke bronnen. Iedere sourceRefs-URL bij markt, concurrenten en kansen moet exact terugkomen in sources. Een homepage die niets zegt over een claim is geen onderbouwing.',
    'DIEPGANG: summary bevat een inhoudelijke synthese van activiteiten, klanten, positionering, digitale aanknopingspunten, marktcontext en belangrijke onzekerheden. Market bevat meerdere concrete trends met bronkoppeling. Competitors bevat specifieke vergelijkingen. Opportunities zijn niet generiek, overlappen niet onnodig en sluiten aantoonbaar aan bij het bedrijf. Scheid waarneming, interpretatie en voorstel.',
    'EINDCONTROLE VÓÓR EXPORT: controleer geldige JSON zonder commentaar of markdown, schema ximo-research version 2, unieke kans-IDs, alle vereiste velden, scores 1–5, echte bron-URL’s, correcte sourceRefs, geen voorbeeldbronnen, geen ongefundeerde feiten, en een unieke bestandsnaam met datum + seconden + willekeurige suffix. Als browsen niet beschikbaar is, vermeld de onderzoeksbeperking eerlijk in summary en presenteer aannames als hypothese.',
    'JSON-CONTRACT: gebruik EXACT de onderstaande structuur en veldnamen. Vul velden met relevante inhoud; laat onbekende zaken expliciet als onzekerheid staan. evidenceType is feit, afleiding of hypothese. Het JSON-voorbeeld is uitsluitend structuur: neem GEEN voorbeeldtekst of voorbeeld-URL over.',
    JSON.stringify(example,null,2),
    'Geef na bestandscreatie de EXACTE bestandsnaam en een werkende downloadlink. Geen ZIP of JSONL. Bij onmogelijke bestandscreatie: geef het volledige JSON-object in een codeblok zodat het handmatig als .json kan worden opgeslagen.'
  ].join('\n');
}
