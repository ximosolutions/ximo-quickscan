import test from 'node:test';
import assert from 'node:assert/strict';
import {researchPrompt,validateResearch} from '../src/route1.js';
test('prompt requires independent sources, competitor research, actual dated downloadable JSON',()=>{
 const p=researchPrompt('Isorama BV','https://isorama.nl');
 for(const term of ['ONDERZOEK 2 — MARKT','concurrenten','onafhankelijke','downloadbaar','YYYYMMDD-HHMMSS','version:2']) assert.ok(p.includes(term),term);
 assert.ok(p.includes('\n'));
});
test('research v2 accepts market, competitors and qualitative scores',()=>{
 const result=validateResearch({schema:'ximo-research',version:2,company:'Isorama BV',summary:'Test',market:[{trend:'Test'}],competitors:[{name:'Vergelijkbaar'}],sources:[],opportunities:[{id:'k1',title:'Kans',scores:{impact:4},evidenceType:'hypothese'}]});
 assert.equal(result.market.length,1);
 assert.equal(result.opportunities[0].scores.impact,4);
});
test('older v1 research still imports',()=>{
 const result=validateResearch({schema:'ximo-research',version:1,company:'Test BV',opportunities:[{title:'Kans'}]});
 assert.equal(result.opportunities[0].title,'Kans');
});
