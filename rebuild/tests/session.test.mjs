import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, replaceInput, setOpportunities, approveReport, canExport } from '../src/session.js';

test('new session starts empty', () => {
  const session = createSession('inventory');
  assert.equal(session.inventory, null);
  assert.equal(canExport(session), false);
});

test('changing source invalidates both approvals', () => {
  let session = createSession('inventory');
  session = approveReport(approveReport(session, 'customer'), 'internal');
  session = replaceInput(session, 'research', { company: 'Demo' });
  assert.equal(canExport(session), false);
  assert.equal(session.analysis, null);
});

test('editing opportunities invalidates both approvals', () => {
  let session = createSession('research');
  session = approveReport(approveReport(session, 'customer'), 'internal');
  session = setOpportunities(session, [{ id: 'one', title: 'Opportunity' }]);
  assert.deepEqual(session.approvals, { customer: false, internal: false });
});

test('route 1 rejects inventory input', () => {
  assert.throws(() => replaceInput(createSession('research'), 'inventory', {}));
});
