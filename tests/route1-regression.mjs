// Run with: node --experimental-default-type=module --test tests/route1-regression.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
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
