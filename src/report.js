import { CHAPTERS } from './contracts.js';
import { checkOpportunities, customerOpportunities } from './route1.js';

function safeText(value) { return typeof value === 'string' ? value : ''; }
export function buildReports({ company, website, research, opportunities }) {
  const qa = checkOpportunities(opportunities);
  if (qa.errors.length) throw new Error(qa.errors.join(' '));
  const ordered = [...opportunities.filter(item=>item.selected),...opportunities.filter(item=>!item.selected)];
  const customer = customerOpportunities(ordered.map(item=>({...item,selected:true})));
  const internal = ordered.map(item => ({
    ...item, sourceRefs: [...(item.sourceRefs || [])]
  }));
  const common = { company: safeText(company), website: safeText(website), chapters: [...CHAPTERS],
    summary: safeText(research?.summary), market: Array.isArray(research?.market)?research.market:[], competitors:Array.isArray(research?.competitors)?research.competitors:[], sources:Array.isArray(research?.sources)?research.sources:[], reportData: research?.reportData || {}, warnings: qa.warnings };
  const customerData = { executiveSummary: safeText(common.reportData.executiveSummary),
    companyFeatures: Array.isArray(common.reportData.companyFeatures) ? common.reportData.companyFeatures.filter(x=>typeof x==='string') : [],
    pilot: { reason: safeText(common.reportData.pilot?.reason),
      steps: Array.isArray(common.reportData.pilot?.steps) ? common.reportData.pilot.steps.filter(x=>typeof x==='string') : [] },
    closing: safeText(common.reportData.closing) };
  return {
    customer: { ...common, reportData: customerData, audience: 'customer', opportunities: customer,
      disclaimer: 'Kansen en impact zijn indicatief en worden tijdens een gesprek gevalideerd.' },
    internal: { ...common, audience: 'internal', opportunities: internal,
      disclaimer: 'Intern werkdocument: controleer bronnen, hypotheses en oplossingsrichtingen.' }
  };
}

export function reportText(report) {
  const lines = [report.company, report.website, report.disclaimer, ''];
  for (const [index, chapter] of report.chapters.entries()) {
    lines.push((index + 1) + '. ' + chapter);
    if (index === 0) lines.push(report.reportData?.executiveSummary || report.summary);
    if (index === 3) {
      for (const item of report.opportunities) {
        lines.push(item.title, item.painPoint || '', item.solution || '', item.example || '', item.benefits || '');
        if (report.audience === 'internal') {
          lines.push(item.internalSolution || '', ...(item.sourceRefs || []));
        }
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}
