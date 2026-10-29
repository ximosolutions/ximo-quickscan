export function createSession(route) {
  if (!['research', 'inventory'].includes(route)) throw new Error('Unknown route');
  return { route, inventory: null, research: null, analysis: null, opportunities: [], approvals: { customer: false, internal: false } };
}

export function replaceInput(session, kind, value) {
  if (!['inventory', 'research', 'analysis'].includes(kind)) throw new Error('Unknown input');
  if (kind === 'inventory' && session.route !== 'inventory') throw new Error('Inventory not allowed');
  return { ...session, [kind]: value, analysis: kind === 'analysis' ? value : null, opportunities: [], approvals: { customer: false, internal: false } };
}

export function setOpportunities(session, opportunities) {
  if (!Array.isArray(opportunities)) throw new Error('Expected opportunities array');
  return { ...session, opportunities: structuredClone(opportunities), approvals: { customer: false, internal: false } };
}

export function approveReport(session, report) {
  if (!['customer', 'internal'].includes(report)) throw new Error('Unknown report');
  return { ...session, approvals: { ...session.approvals, [report]: true } };
}

export function canExport(session) {
  return session.approvals.customer && session.approvals.internal;
}
