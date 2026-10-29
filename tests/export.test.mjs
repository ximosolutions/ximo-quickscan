import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerPdf,createInternalPdf,zipFiles} from '../src/export.js';
import {buildReports} from '../src/report.js';
const opportunities=Array.from({length:3},(_,i)=>({id:'k'+i,title:'Kans '+i,painPoint:'Handwerk',benefits:'Tijdwinst',selected:true,internalSolution:'INTERNAL_SECRET_'+i,sourceRefs:['Bron']})); 
const reports=buildReports({company:'Voorbeeld BV',website:'https://voorbeeld.nl',research:{summary:'Externe context'},opportunities});
const decode=bytes=>new TextDecoder().decode(bytes);
test('customer report has exactly 13 A4 landscape pages',()=>{
 const data=decode(createCustomerPdf(reports.customer));
 assert.ok(data.startsWith('%PDF-1.4'));
 assert.equal((data.match(/\/Type \/Page \/Parent/g)||[]).length,13);
 assert.equal((data.match(/\/MediaBox \[0 0 841.89 595.28\]/g)||[]).length,13);
 assert.ok(!data.includes('INTERNAL_SECRET'));
});
test('internal report has exactly 15 A4 pages and internal details',()=>{
 const data=decode(createInternalPdf(reports.internal));
 assert.equal((data.match(/\/MediaBox \[0 0 595.28 841.89\]/g)||[]).length,15);
 assert.ok(data.includes('INTERNAL_SECRET'));
});
test('zip includes exactly two named PDF files',()=>{
 const zip=zipFiles([{name:'customer.pdf',data:createCustomerPdf(reports.customer)},{name:'internal.pdf',data:createInternalPdf(reports.internal)}]);
 assert.equal(zip.type,'application/zip');
 assert.ok(zip.size>1000);
});

test('internal longlist remains available and customer excludes internal metadata',()=>{
 const items=[...opportunities,{id:'k4',title:'Extra kans',painPoint:'Vervolgonderzoek',selected:false,internalSolution:'SECRET_LONG_LIST'}];
 const pair=buildReports({company:'Voorbeeld BV',website:'https://voorbeeld.nl',
  research:{summary:'Extern',reportData:{executiveSummary:'Openbaar',internalNotes:'SECRET_METADATA',pilot:{steps:['Verkennen'],privateBudget:'SECRET_BUDGET'}}},
  opportunities:items});
 assert.equal(pair.internal.opportunities.length,4);
 assert.equal(pair.customer.opportunities.length,4);
 const customer=decode(createCustomerPdf(pair.customer));
 const internal=decode(createInternalPdf(pair.internal));
 assert.ok(!customer.includes('SECRET_METADATA'));
 assert.ok(!customer.includes('SECRET_BUDGET'));
 assert.ok(!customer.includes('SECRET_LONG_LIST'));
 assert.equal(pair.internal.opportunities[3].internalSolution,'SECRET_LONG_LIST');
 assert.ok(customer.includes('Extra kans'));
});
