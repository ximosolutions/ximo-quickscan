import { validateResearch, normalizeOpportunity } from './route1.js';
import { checkOpportunities } from './route1.js';

export const SESSION_SCHEMA = 'ximo-quickscan-session';
export const SESSION_VERSION = 1;
export function exportSession(session) {
  if (session?.route !== 'research') throw new Error('Alleen Route 1 kan worden bewaard.');
  return JSON.stringify({schema:SESSION_SCHEMA,version:SESSION_VERSION,company:session.company||'',website:session.website||'',research:session.research?.original||null,opportunities:session.opportunities||[]},null,2);
}
export function importSession(text) {
  let data;
  try { data=JSON.parse(text); } catch { throw new Error('Geen geldig Quickscan-sessiebestand (JSON).'); }
  if (!data || typeof data!=='object'||Array.isArray(data)||data.schema!==SESSION_SCHEMA||data.version!==SESSION_VERSION) throw new Error('Onbekend Quickscan-sessiebestand of versie.');
  if(typeof data.company!=='string'||!data.company.trim()||typeof data.website!=='string'||!/^https?:\/\//i.test(data.website)) throw new Error('Bedrijfsnaam of website ontbreekt in sessie.');
  if(!Array.isArray(data.opportunities)||data.opportunities.length>100) throw new Error('Ongeldige kansenlijst in sessie.');
  if(data.opportunities.length && !data.research) throw new Error('Sessie bevat kansen zonder onderzoek.');
  const research=data.research?validateResearch(data.research):null;
  const opportunities=data.opportunities.map((item,index)=>({...normalizeOpportunity(item,index),selected:item.selected===true}));
  if(new Set(opportunities.map(x=>x.id)).size!==opportunities.length) throw new Error('Dubbele kans-ID’s in sessie.');
  if(research && research.company.trim().toLowerCase()!==data.company.trim().toLowerCase()) throw new Error('Bedrijfsnaam in sessie wijkt af van het onderzoek.');
  return {route:'research',inventory:null,analysis:null,company:data.company.trim(),website:data.website.trim(),research,opportunities,approvals:{customer:false,internal:false}};
}
