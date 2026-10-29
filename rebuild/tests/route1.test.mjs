import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResearch, checkOpportunities, customerOpportunities } from '../src/route1.js';
import { buildReports, reportText } from '../src/report.js';

const opportunities = Array.from({length:3},(_,i) => ({
  id:'k'+i,title:'Kans '+i,painPoint:'Veel handwerk',benefits:'Minder overdracht',
  internalSolution:'Vertrouwelijke oplossingsarchitectuur',sourceRefs:['bron '+i],selected:true
}));
const research = {schema:'ximo-research',version:1,company:'Demo BV',website:'https://demo.nl',summary:'Context',opportunities};
test('research v1 validates and preserves company', () => {
  assert.equal(validateResearch(research).company,'Demo BV');
  assert.equal(validateResearch(research).opportunities.length,3);
});
test('unknown research version fails safely', () => {
  assert.throws(() => validateResearch({...research,version:2}));
});
test('three selected opportunities pass minimum QA', () => {
  assert.equal(checkOpportunities(opportunities).errors.length,0);
});
test('only two selected opportunities fail QA', () => {
  assert.ok(checkOpportunities(opportunities.slice(0,2)).errors.length);
});
test('internal solution is excluded from customer data and preview', () => {
  const safe = customerOpportunities(opportunities);
  assert.ok(safe.every(x => !('internalSolution' in x)));
  const reports = buildReports({company:'Demo BV',website:'https://demo.nl',research,opportunities});
  assert.equal(reportText(reports.customer).includes('Vertrouwelijke oplossingsarchitectuur'),false);
  assert.equal(reportText(reports.internal).includes('Vertrouwelijke oplossingsarchitectuur'),true);
  assert.equal(reports.customer.chapters.length,6);
});
