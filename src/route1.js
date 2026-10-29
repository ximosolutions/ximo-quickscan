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
  if (data.opportunities.length > 100) throw new ContractError('Het onderzoek bevat te veel kansen (maximaal 100).', 'TOO_MANY_OPPORTUNITIES');
  const opportunities = data.opportunities.map((item, index) => normalizeOpportunity(item, index));
  if (!opportunities.length) throw new ContractError('Het onderzoek bevat geen AI-kansen.', 'EMPTY_OPPORTUNITIES');
  const ids=opportunities.map(item=>item.id);
  if (new Set(ids).size!==ids.length) throw new ContractError('Het onderzoek bevat dubbele kans-ID’s.', 'DUPLICATE_OPPORTUNITIES');
  const names=opportunities.map(item=>item.title.toLocaleLowerCase('nl-NL').replace(/\s+/g,' ').trim());
  if(new Set(names).size!==names.length) throw new ContractError('Het onderzoek bevat dubbele kanstitels. Controleer de kansen vóór import.', 'DUPLICATE_TITLES');
  return { company: data.company.trim(), website: text(data.website) ? data.website.trim() : '',
    summary: text(data.summary) ? data.summary.trim() : '', market: Array.isArray(data.market) ? data.market : [], competitors: Array.isArray(data.competitors) ? data.competitors : [], sources: Array.isArray(data.sources) ? data.sources : [], opportunities, reportData: record(data.reportData) ? data.reportData : {}, original: data };
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
    sourceRefs: Array.isArray(item.sourceRefs) ? [...new Set(item.sourceRefs.filter(text).map(ref=>ref.trim()))] : [],
    evidenceType: text(item.evidenceType) ? item.evidenceType.trim() : 'hypothese',
    scores: normalizeScores(item.scores),
    process: text(item.process) ? item.process.trim() : '',
    solution: text(item.solution) ? item.solution.trim() : '',
    example: text(item.example) ? item.example.trim() : '',
    processSteps: Array.isArray(item.processSteps) ? item.processSteps.filter(text).slice(0,5) : [],
    validationQuestions: Array.isArray(item.validationQuestions) ? item.validationQuestions.filter(text).slice(0,5) : [],
    risks: Array.isArray(item.risks) ? item.risks.filter(text) : [],
    conditions: Array.isArray(item.conditions) ? item.conditions.filter(text) : [],
    kpis: Array.isArray(item.kpis) ? item.kpis.filter(text) : [],
    scoreRationale: text(item.scoreRationale) ? item.scoreRationale.trim() : '',
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
  else if(refs.some(ref=>!/^https?:\/\//i.test(ref))) issues.push('Bronverwijzing bevat geen volledige http(s)-URL.');
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

export { researchPrompt } from './research-prompt.js';
