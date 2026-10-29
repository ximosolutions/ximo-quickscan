import { parseJson } from './contracts.js';
import { createSession, replaceInput, setOpportunities } from './session.js';
import { validateResearch, researchPrompt, checkOpportunities, researchQuality, normalizeOpportunity, opportunityPriority, prioritizeOpportunities, opportunityQuality } from './route1.js?v=59';
import { buildReports, reportText } from './report.js';
import { privacyWarnings } from './privacy.js';
import { createCustomerPdf, createInternalPdf, zipFiles, download } from './export.js';

const $ = id => document.getElementById(id);
let session = createSession('research');
let reports = null;
let previewUrls = [];
function releasePreviews() { for (const url of previewUrls) URL.revokeObjectURL(url); previewUrls = []; }
function renderPdfPreviews() {
  releasePreviews();
  const files = [createCustomerPdf(reports.customer),createInternalPdf(reports.internal)];
  for (const [index,id] of ['customerPreview','internalPreview'].entries()) {
    const url=URL.createObjectURL(new Blob([files[index]],{type:'application/pdf'}));
    previewUrls.push(url);
    $(id).src=url+'#toolbar=1&navpanes=0';
  }
}
const setStatus = (message, type = '') => {
  $('status').textContent = message;
  $('status').className = type;
};
let currentStep = 0;
function highestAvailableStep() {
  if (reports) return 3;
  if (session.opportunities.length && session.research) return 2;
  if (session.company && session.website) return 1;
  return 0;
}
function show(step) {
  if (step > highestAvailableStep()) return;
  currentStep = step;
  const progress = $('progressTop');
  progress.style.width = ((step + 1) / 4 * 100) + '%';
  progress.setAttribute('aria-valuenow', String(step + 1));
  for (let i = 0; i < 4; i++) {
    $('page' + i).classList.toggle('hidden', i !== step);
    const nav = document.querySelector('[data-step="' + i + '"]');
    nav.classList.toggle('active', i === step);
    nav.disabled = i > highestAvailableStep();
    nav.setAttribute('aria-current',i === step ? 'step' : 'false');
  }
  setStatus('');
}
const field = (label, value, onChange, multiline = false) => {
  const wrapper = document.createElement('div');
  const caption = document.createElement('label');
  caption.textContent = label;
  const input = document.createElement(multiline ? 'textarea' : 'input');
  input.value = value || '';
  input.addEventListener('change', () => onChange(input.value));
  wrapper.append(caption, input);
  return wrapper;
};
function commit(items) {
  session = setOpportunities(session, items);
  reports = null;
  releasePreviews();
  resetApprovals();
  renderOpportunities();
}
let expandedOpportunityId = null;
function renderOpportunities() {
  const root = $('opportunities');
  root.replaceChildren();
  const selectedCount = session.opportunities.filter(item => item.selected).length;
  const summary = document.createElement('p');
  summary.className = 'muted';
  summary.textContent = selectedCount + ' van 3–5 kansen geselecteerd · ' + session.opportunities.length + ' kansen beschikbaar';
  $('selectionIndicator').textContent = selectedCount + ' van 5 kansen gekozen' + (selectedCount>=3&&selectedCount<=5?' · Klaar om door te gaan':' · Kies 3 tot 5');
  root.append(summary);
  session.opportunities.forEach((item,index) => {
    const card = document.createElement('article');
    card.className = 'card opportunity-card';
    if (item.selected) card.classList.add('is-selected');
    const top = document.createElement('div');
    top.className = 'opportunity-top';
    const toggle = document.createElement('label');
    toggle.className = 'opportunity-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.selected;
    checkbox.setAttribute('aria-label','Selecteer '+item.title);
    checkbox.addEventListener('change',()=>update(index,'selected',checkbox.checked));
    toggle.append(checkbox);
    const info = document.createElement('div');
    info.className = 'opportunity-info';
    const title = document.createElement('strong');
    title.textContent = (index+1)+'. '+item.title;
    const description = document.createElement('p');
    description.className = 'opportunity-summary';
    description.textContent = item.painPoint || 'Nog geen pijnpunt beschreven';
    info.append(title,description);
    const priority=opportunityPriority(item);
    const scoreInfo=document.createElement('p');
    scoreInfo.className='muted tiny';
    scoreInfo.textContent=priority.complete?'Indicatieve prioriteit: '+priority.score+'/100 · '+priority.label:'Prioriteit nog niet beoordeeld · scores ontbreken';
    info.append(scoreInfo);
    const quality=opportunityQuality(item,session.research);
    const qualityInfo=document.createElement('p');
    qualityInfo.className='tiny '+(quality.status==='Gegevens aanwezig'?'ok':quality.status==='Verificatie nodig'?'warn':'error');
    qualityInfo.textContent=quality.status+' · '+quality.linkedSources+'/'+quality.sourceCount+' bronnen gekoppeld'+(quality.issues.length?' · '+quality.issues.length+' aandachtspunten':'');
    info.append(qualityInfo);
    const controls = document.createElement('div');
    controls.className = 'opportunity-controls';
    const edit = document.createElement('button');
    edit.className = 'secondary';
    const expanded = expandedOpportunityId === item.id;
    edit.textContent = expanded ? 'Sluiten' : 'Details';
    edit.setAttribute('aria-expanded',String(expanded));
    edit.addEventListener('click',()=>{expandedOpportunityId=expanded?null:item.id;renderOpportunities();});
    controls.append(edit);
    for (const [label,offset] of [['↑',-1],['↓',1]]) {
      const button=document.createElement('button');
      button.className='secondary compact';
      button.textContent=label;
      button.title=offset<0?'Kans omhoog':'Kans omlaag';
      button.setAttribute('aria-label',button.title+': '+item.title);
      button.disabled=index+offset<0||index+offset>=session.opportunities.length;
      button.addEventListener('click',()=>move(index,offset));
      controls.append(button);
    }
    const removeQuick=document.createElement('button');
    removeQuick.className='secondary compact remove-opportunity';
    removeQuick.textContent='×';
    removeQuick.title='Kans verwijderen';
    removeQuick.setAttribute('aria-label','Verwijder kans: '+item.title);
    removeQuick.addEventListener('click',()=>removeOpportunity(index));
    controls.append(removeQuick);
    top.append(toggle,info,controls);
    card.append(top);
    if (expanded) {
      const details=document.createElement('div');
      details.className='opportunity-details';
      for (const [key,name,multiline] of [
        ['title','Titel',false],['painPoint','Mogelijk pijnpunt',true],
        ['benefits','Verwacht voordeel',true],['impactSummary','Kwalitatieve impact',true],
        ['feasibilitySummary','Haalbaarheid',true],['verificationNote','Te verifiëren',true],
        ['internalSolution','Interne oplossingsrichting (niet klantgericht)',true]
      ]) details.append(field(name,item[key],value=>update(index,key,value),multiline));
      const evidence=document.createElement('p');
      evidence.className='muted tiny';
      evidence.textContent='Onderbouwing: '+(item.evidenceType||'niet beoordeeld')+' · Bronnen: '+(item.sourceRefs?.length||0);
      details.append(evidence);
      const qualityList=document.createElement('div');
      qualityList.className='quality-issues';
      const heading=document.createElement('strong');heading.textContent='Kwaliteitscontrole';qualityList.append(heading);
      if (!quality.issues.length) { const p=document.createElement('p');p.textContent='Geen ontbrekende velden vastgesteld. Controleer broninhoud zelf.';qualityList.append(p); }
      for (const issue of quality.issues) { const p=document.createElement('p');p.textContent='• '+issue;qualityList.append(p); }
      details.append(qualityList);
      const scores=document.createElement('div');scores.className='score-editor';
      for (const [key,label] of [['relevance','Relevantie'],['impact','Impact'],['feasibility','Haalbaarheid'],['evidence','Bewijssterkte']]) {
        const wrapper=document.createElement('label');wrapper.textContent=label+' (1–5)';
        const select=document.createElement('select');
        for (const [value,name] of [['','Niet beoordeeld'],...Array.from({length:5},(_,i)=>[String(i+1),String(i+1)])]) {
          const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);
        }
        select.value=String(item.scores?.[key]??'');
        select.addEventListener('change',()=>{
          const next={...item.scores};if(select.value) next[key]=Number(select.value);else delete next[key];
          update(index,'scores',next);
        });
        wrapper.append(select);scores.append(wrapper);
      }
      details.append(scores);
      const refsField=field('Bron-URL’s (één per regel)',(item.sourceRefs||[]).join('\n'),value=>update(index,'sourceRefs',value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)),true);
      details.append(refsField);
      const remove=document.createElement('button');
      remove.className='secondary';
      remove.textContent='Kans verwijderen';
      remove.addEventListener('click',()=>removeOpportunity(index));
      details.append(remove);
      card.append(details);
    }
    root.append(card);
  });
  const qa=checkOpportunities(session.opportunities);
  $('qa').replaceChildren();
  for (const message of qa.errors) {
    const p=document.createElement('p');p.className='error';p.textContent=message;$('qa').append(p);
  }
  if(qa.warnings.length){
    const details=document.createElement('details');details.className='qa-summary';
    const summary=document.createElement('summary');
    summary.textContent=qa.warnings.length+' aannames of aandachtspunten — klik om te bekijken';
    details.append(summary);
    for(const message of qa.warnings){
      const p=document.createElement('p');p.textContent=message;details.append(p);
    }
    $('qa').append(details);
  }
  $('toReports').disabled=qa.errors.length>0;
}
function removeOpportunity(index) {
  const item=session.opportunities[index];
  if (!item) return;
  if (!window.confirm('Kans verwijderen: '+item.title+'? Deze actie kan niet ongedaan worden gemaakt.')) return;
  expandedOpportunityId=null;
  commit(session.opportunities.filter((_,i)=>i!==index));
  setStatus('Kans verwijderd.','ok');
}
function update(index, key, value) {
  const items = session.opportunities.map((item,i) => i === index ? {...item,[key]:value} : item);
  commit(items);
}
function move(index, offset) {
  const target = index + offset;
  if (target < 0 || target >= session.opportunities.length) return;
  const items = [...session.opportunities];
  [items[index],items[target]] = [items[target],items[index]];
  commit(items);
}
$('start').addEventListener('click', () => {
  const company = $('company').value.trim();
  const website = $('website').value.trim();
  if (!company || !/^https?:\/\//i.test(website)) {
    setStatus('Vul een bedrijfsnaam en volledige website-URL in.', 'error'); return;
  }
  try {
    session = {...session, company, website};
    $('prompt').value = researchPrompt(company, website);
    show(1);
    const warnings = privacyWarnings({company,website});
    if (warnings.length) setStatus('Privacycontrole: controleer herkenbare gegevens voordat je de prompt extern deelt.', 'warn');
  } catch (error) { setStatus(error.message, 'error'); }
});
$('copyPrompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('prompt').value); setStatus('Onderzoeksprompt gekopieerd.', 'ok'); }
  catch { $('prompt').select(); setStatus('Selecteer en kopieer de prompt handmatig.', 'warn'); }
});
$('researchFile').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 2_000_000) { setStatus('JSON-bestand is groter dan 2 MB.', 'error'); return; }
  try {
    $('researchJson').value = await file.text();
    importResearch();
  } catch (error) { setStatus('Bestand lezen mislukt: '+error.message,'error'); }
});
function importResearch() {
  try {
    const parsed = validateResearch(parseJson($('researchJson').value));
    const ids = parsed.opportunities.map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error('Onderzoeks-JSON bevat dubbele kans-ID’s. Corrigeer dit eerst.');
    if (parsed.company.toLocaleLowerCase('nl-NL') !== session.company.toLocaleLowerCase('nl-NL')) {
      if (!window.confirm('De bedrijfsnamen verschillen. Heb je gecontroleerd dat dit hetzelfde bedrijf is?')) return;
    }
    if (session.research && !window.confirm('Dit vervangt het huidige onderzoek en eventuele kansbewerkingen. Doorgaan?')) return;
    resetApprovals();
    session = replaceInput(session, 'research', parsed);
    session = setOpportunities(session, prioritizeOpportunities(parsed.opportunities));
    expandedOpportunityId = null;
    renderOpportunities();
    show(2);
    const quality=researchQuality(parsed);
    const headline='Kansen op indicatieve prioriteit gesorteerd; maximaal vijf voorgeselecteerd. ' + 'Onderzoek geïmporteerd: '+quality.opportunityCount+' kansen, '+quality.sourceCount+' bron-URL’s, '+quality.marketCount+' marktontwikkelingen en '+quality.competitorCount+' concurrenten.';
    setStatus(headline+(quality.issues.length?' Aandachtspunten: '+quality.issues.join(' '):' Basiscontrole afgerond.'),quality.issues.length?'warn':'ok');
  } catch (error) { setStatus(error.message, 'error'); }
}
$('import').addEventListener('click',importResearch);
$('add').addEventListener('click', () => {
  const id = 'manual-' + crypto.randomUUID();
  commit([...session.opportunities, {...normalizeOpportunity({id,title:'Nieuwe kans'}),selected:false}]);
});
$('toReports').addEventListener('click', () => {
  try {
    reports = buildReports({...session, research: session.research});
    renderPdfPreviews();
    resetApprovals();
    show(3);
  } catch (error) { setStatus(error.message, 'error'); }
});
for (const [id, step] of [['back1',0],['back2',1],['back3',2]]) $(id).addEventListener('click', () => show(step));
for (const [id, audience] of [['copyCustomer','customer'],['copyInternal','internal']]) {
  $(id).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(reportText(reports[audience])); setStatus('Concept gekopieerd.', 'ok'); }
    catch { setStatus('Kopiëren mislukt; selecteer de concepttekst handmatig.', 'warn'); }
  });
}

function resetApprovals() {
  $('approveCustomer').checked = false;
  $('approveInternal').checked = false;
  updateExportButtons();
}
function updateExportButtons() {
  $('downloadCustomer').disabled = !reports || !$('approveCustomer').checked;
  $('downloadInternal').disabled = !reports || !$('approveInternal').checked;
  $('downloadZip').disabled = !reports || !$('approveCustomer').checked || !$('approveInternal').checked;
}
$('approveCustomer').addEventListener('change', updateExportButtons);
$('approveInternal').addEventListener('change', updateExportButtons);
const customerFile = () => new Blob([createCustomerPdf(reports.customer)], {type:'application/pdf'});
const internalFile = () => new Blob([createInternalPdf(reports.internal)], {type:'application/pdf'});
$('downloadCustomer').addEventListener('click', () => {
  if ($('downloadCustomer').disabled) return;
  download(customerFile(), 'ximo-klantpresentatie.pdf');
});
$('downloadInternal').addEventListener('click', () => {
  if ($('downloadInternal').disabled) return;
  download(internalFile(), 'ximo-intern-rapport.pdf');
});
$('downloadZip').addEventListener('click', () => {
  if ($('downloadZip').disabled) return;
  download(zipFiles([
    {name:'ximo-klantpresentatie.pdf',data:createCustomerPdf(reports.customer)},
    {name:'ximo-intern-rapport.pdf',data:createInternalPdf(reports.internal)}
  ]),'ximo-quickscan-rapporten.zip');
});

for (const nav of document.querySelectorAll('[data-step]')) {
  nav.addEventListener('click', () => {
    const step=Number(nav.dataset.step);
    if (step <= highestAvailableStep()) show(step);
  });
}
$('newScan').addEventListener('click', () => {
  if (!window.confirm('Nieuwe scan starten? Alle huidige invoer, kansbewerkingen en goedkeuringen verdwijnen. Download eerst eventuele rapporten of bewaar je onderzoeks-JSON.')) return;
  releasePreviews();
  session=createSession('research');
  reports=null;
  expandedOpportunityId=null;
  for (const id of ['company','website','prompt','researchJson','researchFile']) $(id).value='';
  $('opportunities').replaceChildren();
  $('qa').replaceChildren();
  $('customerPreview').removeAttribute('src');
  $('internalPreview').removeAttribute('src');
  resetApprovals();
  show(0);
  setStatus('Nieuwe scan gestart.', 'ok');
});
show(0);
