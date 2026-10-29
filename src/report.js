import { CHAPTERS } from './contracts.js';
import { checkOpportunities, customerOpportunities } from './route1.js';

function safeText(value) { return typeof value === 'string' ? value : ''; }
export function buildReports({ company, website, research, opportunities }) {
  const qa = checkOpportunities(opportunities);
  if (qa.errors.length) throw new Error(qa.errors.join(' '));
  const customer = customerOpportunities(opportunities);
  const internal = qa.selected.map(item => ({
    ...item, sourceRefs: [...(item.sourceRefs || [])]
  }));
  const common = { company: safeText(company), website: safeText(website), chapters: [...CHAPTERS],
    summary: safeText(research?.summary), market: Array.isArray(research?.market)?research.market:[], competitors:Array.isArray(research?.competitors)?research.competitors:[], sources:Array.isArray(research?.sources)?research.sources:[], warnings: qa.warnings };
  return {
    customer: { ...common, audience: 'customer', opportunities: customer,
      disclaimer: 'Kansen en impact zijn indicatief en worden tijdens een gesprek gevalideerd.' },
    internal: { ...common, audience: 'internal', opportunities: internal,
      disclaimer: 'Intern werkdocument: controleer bronnen, hypotheses en oplossingsrichtingen.' }
  };
}

export function reportText(report) {
  const lines = [report.company, report.website, report.disclaimer, ''];
  for (const [index, chapter] of report.chapters.entries()) {
    lines.push((index + 1) + '. ' + chapter);
    if (index === 0) lines.push(report.summary);
    if (index === 3) {
      for (const item of report.opportunities) {
        lines.push(item.title, item.painPoint || '', item.benefits || '');
        if (report.audience === 'internal') {
          lines.push(item.internalSolution || '', ...(item.sourceRefs || []));
        }
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}
