import { exportSession, importSession } from '../src/session-file.js';
// Run with: node --experimental-default-type=module --test tests/route1-regression.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, replaceInput, setOpportunities, approveReport, canExport } from '../src/session.js';
import { parseJson, compareCompanyNames, toCustomerOpportunity } from '../src/contracts.js';
import { researchPrompt, validateResearch, opportunityPriority, opportunityQuality, prioritizeOpportunities } from '../src/route1.js';

const opportunity = (id, scores={relevance:4,impact:4,feasibility:3,evidence:2}) => ({
  id,title:'Kans '+id,painPoint:'Mogelijke handmatige verwerking',benefits:'Minder dubbel werk',
  verificationNote:'Hoeveel aanvragen worden verwerkt?',sourceRefs:['https://example.org/onderzoek'],
  evidenceType:'hypothese',scores
});
const research = {
  schema:'ximo-research',version:2,company:'Test BV',website:'https://example.org',
  sources:[{url:'https://example.org/onderzoek',independent:true}],
  opportunities:[opportunity('k1'),opportunity('k2'),opportunity('k3')]
};

test('research prompt V3 explicitly requires timestamp and unique suffix',()=>{
  const prompt=researchPrompt('Test BV','https://example.org');
  assert.match(prompt,/RESEARCH ENGINE V3/);
  assert.match(prompt,/YYYYMMDD-HHMMSS-BEDRIJF-ximo-research-XXXXXX\.json/);
  assert.match(prompt,/Gebruik als BEDRIJF: test-bv/);
  assert.match(prompt,/BRONNENKWALITEIT/);
});
test('research import preserves validated opportunities and scores',()=>{
  const result=validateResearch(research);
  assert.equal(result.opportunities.length,3);
  assert.equal(result.opportunities[0].scores.relevance,4);
});
test('duplicate opportunity IDs are rejected',()=>{
  assert.throws(()=>validateResearch({...research,opportunities:[opportunity('k1'),opportunity('k1')]}),/dubbele kans-ID/);
});
test('quality is independent of priority score',()=>{
  const item=opportunity('k1');
  assert.equal(opportunityPriority(item).complete,true);
  const quality=opportunityQuality(item,research);
  assert.equal(quality.status,'Verificatie nodig');
  assert.equal(quality.linkedSources,1);
});
test('missing evidence yields incomplete quality without inventing sources',()=>{
  const item={...opportunity('k1'),sourceRefs:[],verificationNote:''};
  const quality=opportunityQuality(item,research);
  assert.equal(quality.status,'Onvoldoende informatie');
  assert.equal(quality.linkedSources,0);
});
test('priority selection is capped at five',()=>{
  const items=Array.from({length:7},(_,i)=>opportunity('k'+i));
  assert.equal(prioritizeOpportunities(items).filter(x=>x.selected).length,5);
});


test('invalid JSON produces a clear validation error',()=>{
  assert.throws(()=>parseJson('{bad json'),/geen geldige JSON/);
  assert.throws(()=>parseJson('   '),/Geen JSON-inhoud/);
});
test('approvals are invalidated after editing opportunities',()=>{
  let session=createSession('research');
  session=approveReport(approveReport(session,'customer'),'internal');
  assert.equal(canExport(session),true);
  session=setOpportunities(session,[opportunity('k1')]);
  assert.equal(canExport(session),false);
  assert.equal(session.approvals.customer,false);
  assert.equal(session.approvals.internal,false);
});
test('new research invalidates previous opportunities and approvals',()=>{
  let session=createSession('research');
  session=setOpportunities(session,[opportunity('k1')]);
  session=approveReport(approveReport(session,'customer'),'internal');
  session=replaceInput(session,'research',research);
  assert.deepEqual(session.opportunities,[]);
  assert.equal(canExport(session),false);
});
test('inventory data cannot be added to research-only route',()=>{
  assert.throws(()=>replaceInput(createSession('research'),'inventory',{}),/Inventory not allowed/);
});
test('customer export excludes internal solution and source references',()=>{
  const result=toCustomerOpportunity({...opportunity('k1'),internalSolution:'Intern advies',sourceRefs:['https://example.org']});
  assert.equal('internalSolution' in result,false);
  assert.equal('sourceRefs' in result,false);
});
test('different trade names trigger review rather than a hard rejection',()=>{
  assert.equal(compareCompanyNames('Voorbeeld BV','Andere Handelsnaam').status,'uncertain');
});

test('saved session restores opportunities but never report approvals',()=>{
 const original={...createSession('research'),company:'Test BV',website:'https://example.org',research:{original:research},opportunities:[{...opportunity('k1'),selected:true}]};
 const restored=importSession(exportSession(original));
 assert.equal(restored.company,'Test BV');
 assert.equal(restored.opportunities[0].title,'Kans k1');
 assert.equal(restored.approvals.customer,false);
 assert.equal(restored.approvals.internal,false);
});
test('session import rejects invalid versions and missing research',()=>{
 assert.throws(()=>importSession('{'),/Geen geldig/);
 assert.throws(()=>importSession(JSON.stringify({schema:'ximo-quickscan-session',version:99})),/Onbekend/);
 assert.throws(()=>importSession(JSON.stringify({schema:'ximo-quickscan-session',version:1,company:'Test BV',website:'https://example.org',opportunities:[opportunity('k1')]})),/zonder onderzoek/);
});

test('duplicate opportunity titles are rejected even with unique IDs',()=>{
 const a=opportunity('a');const b={...opportunity('b'),title:'  KANS A  '};
 assert.throws(()=>validateResearch({...research,opportunities:[a,b]}),/dubbele kanstitels/);
});
test('research import rejects more than 100 opportunities',()=>{
 assert.throws(()=>validateResearch({...research,opportunities:Array.from({length:101},(_,i)=>opportunity('k'+i))}),/maximaal 100/);
});
test('source URLs are preserved but invalid links flagged',()=>{
 const item={...opportunity('a'),sourceRefs:['https://example.org/onderzoek','not-a-url','https://example.org/onderzoek']};
 const imported=validateResearch({...research,opportunities:[item]}).opportunities[0];
 assert.equal(imported.sourceRefs.length,2);
 assert.ok(opportunityQuality(imported,research).issues.some(issue=>issue.includes('http(s)-URL')));
});
