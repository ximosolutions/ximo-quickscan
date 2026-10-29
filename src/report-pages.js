// Content plans for the approved customer (13 pages) and Ximo internal (15 pages) reports.
// Keep all claims conditional until verified; never manufacture financial figures.
const value=(x,fallback='Nog te verifiëren')=>typeof x==='string'&&x.trim()?x.trim():fallback;
const list=(xs,n=4)=>Array.isArray(xs)?xs.slice(0,n).map(x=>value(typeof x==='string'?x:x?.text||x?.title||x?.description)): [];
const entry=(title,...parts)=>({text:title+' | '+parts.filter(Boolean).join(' · ')});
const page=(title,...items)=>[{text:title,title:true},...items.filter(Boolean).map(x=>typeof x==='string'?{text:x}:x)];
const label=(o,i)=>String(i+1).padStart(2,'0')+' / '+value(o?.title,'Nog niet onderzocht');
const top3=r=>(r.opportunities||[]).slice(0,3);
const extra=r=>(r.opportunities||[]).slice(3,10);
const scores=o=>'Impact '+(o?.scores?.impact??'?')+'/5; haalbaarheid '+(o?.scores?.feasibility??'?')+'/5; bewijs '+(o?.scores?.evidence??'?')+'/5 (indicatief)';
const description=o=>value(o?.painPoint||o?.benefits,'Onderzoek en verificatie nodig');
const refs=r=>list(r.sources,3).map(x=>typeof x==='string'?x:String(x));
export function customerPages(r){
 const top=top3(r), other=extra(r), d=r.reportData||{};
 const detail=(o,i)=>o?page(label(o,i),
   entry('Mogelijk knelpunt',value(o.painPoint)),
   entry('Oplossing',value(o.solution||o.benefits)),
   entry('Zo kan het werken',list(o.processSteps,4).join(' > ')),
   entry('Voorbeeld',value(o.example)),
   entry('Mogelijke waarde',value(o.benefits)),
   entry('Eerst toetsen',list(o.validationQuestions,2).join(' / ')||value(o.verificationNote))
 ):page('Kans '+(i+1)+' nog niet onderzocht','Geen voldoende onderbouwde kans beschikbaar.');
 return [
  page('Eerst begrijpen. Dan kiezen.',entry('Bedrijf',r.company),'Quickscan / indicatieve kansen, geen gevalideerde bedrijfsresultaten'),
  page('In één oogopslag.','Samenvatting · Top 3 · Verdieping · Bedrijfscontext · Overige kansen · Impact · Pilot · Vervolg'),
  page('Veel mogelijkheden. Eerst de juiste.',value(d.executiveSummary||r.summary),...top.map((o,i)=>entry(label(o,i),description(o)))),
  page('Drie kansen om te onderzoeken.',...top.map((o,i)=>entry(label(o,i),value(o.solution||o.benefits)))),
  ...[0,1,2].map(i=>detail(top[i],i)),
  page('Het bedrijf in beeld.',value(r.summary),...list(d.companyFeatures,4)),
  page('Meer kansen. Meer mogelijkheden.',...other.slice(0,4).map((o,i)=>entry(label(o,i+3),description(o))),...(other.length?[]:['Aanvullende kansen zijn nog niet voldoende onderbouwd.'])),
  page('Aanvullende kansen.',...other.slice(4,7).map((o,i)=>entry(label(o,i+7),description(o))),...(other.length>4?[]:['Geen extra kansen zonder onderbouwing toegevoegd.'])),
  page('Impact en haalbaarheid.',...top.map((o,i)=>entry(label(o,i),scores(o))),'Scores zijn indicatief en moeten bij de klant worden getoetst.'),
  page('Van inzicht naar actie.',...list(d.pilot?.steps,4).map((x,i)=>entry('Stap '+(i+1),x)),entry('Pilot',value(d.pilot?.reason)),'Klein starten, meetbaar leren en samen besluiten.'),
  page('Samen verder.',value(d.closing,'Welke kansen zijn herkenbaar? We toetsen de aannames en bepalen samen de volgende stap.'))
 ];
}
export function internalPages(r){
 const top=top3(r),other=extra(r),d=r.reportData||{};
 const t=(i)=>top[i];
 const evidence=o=>entry('Bewijs en verificatie',value(o?.evidenceType||o?.verificationNote),list(o?.validationQuestions,2).join(' / '));
 return [
  page('Eerst begrijpen. Dan gericht aanbieden.',entry('Vertrouwelijk / Ximo intern',r.company),'Onderzoeks-, advies- en acquisitiedossier. Concept; intern proces en budget niet bevestigd.'),
  page('In één oogopslag.','01 Managementsamenvatting · 02 Bedrijf en bewijs · 03 Top 3 · 04 Overige kansen','05 Techniek · 06 Commercieel · 07 Gesprek · 08 Pilot en actieplan'),
  page('Drie richtingen. Eerst toetsen.',value(d.executiveSummary||r.summary),...top.map((o,i)=>entry(label(o,i),description(o))),'Commerciële interesse en budget zijn niet bevestigd.'),
  page('Feiten scheiden. Aannames zichtbaar.',entry('Publiek bedrijfsbeeld',value(r.summary)),...list(d.companyFeatures,3).map((x,i)=>entry('Bedrijfskenmerk '+(i+1),x)),entry('Bronstatus',refs(r).join(' / ')||'Controleer oorspronkelijke bronnen'),'Interne processen, volumes, kosten en systemen nog valideren.'),
  page('Drie kansen. Gericht verdiepen.',...top.map((o,i)=>entry(label(o,i),scores(o))),'Rangorde en scores zijn voorlopige inschattingen.'),
  page('Technische businesscase 1.',entry('Kans',value(t(0)?.title)),entry('Probleemhypothese',value(t(0)?.painPoint)),entry('Oplossing',value(t(0)?.internalSolution||t(0)?.solution)),entry('Techniek en proces',list(t(0)?.processSteps,4).join(' > ')),entry('Risico en controle',list(t(0)?.risks,2).join(' / ')),entry('Pilot',list(t(0)?.kpis,2).join(' / '))),
  page('Businesscases 2 en 3.',...[1,2].flatMap(i=>[entry(label(t(i),i),'Oplossing: '+value(t(i)?.internalSolution||t(i)?.solution)),entry('Data, risico en pilot',list(t(i)?.conditions,2).join(' / '),list(t(i)?.kpis,2).join(' / '))])),
  page('Overige kansen. Compact bekeken.',...other.slice(0,5).map((o,i)=>entry(label(o,i+3),description(o))),...(other.length?[]:['Geen extra kansen zonder bewijs toegevoegd.'])),
  page('Techniek met duidelijke grenzen.',...top.map((o,i)=>entry(label(o,i),value(o.internalSolution||o.solution),list(o.processSteps,3).join(' > '))),'Architectuur en integraties zijn hypothesen totdat de systemen zijn bevestigd.'),
  page('Van kans naar Ximo-propositie.',entry('A / Discovery','Procesworkshop, inventarisatie, nulmeting en businesscase'),entry('B / Pilot','Afgebakende use-case met KPI en stop-/go-criteria'),entry('C / Implementatie','Integratie, beheer, privacy, training en uitrol'),entry('D / Optimalisatie','Monitoring, adoptie en doorlopende verbetering')),
  page('Waar begint het gesprek?',entry('Voorkeursroute',value(t(0)?.title)),entry('Aanleiding',value(t(0)?.painPoint)),entry('Alternatieven',top.slice(1).map(o=>o.title).join(' / ')),entry('Beslissing','Probleemeigenaar, data, urgentie, budgethouder en systeemtoegang eerst bevestigen')),
  page('Vragen die bewijs opleveren.',...top.flatMap((o,i)=>list(o.validationQuestions,2).map(q=>entry(label(o,i),q))),entry('Besluitvorming','Wie beheert het proces, de data en het budget?')),
  page('Klein beginnen. Goed meten.',...['Discovery','Afbakening','Prototype','Meten','Besluit'].map((x,i)=>entry(String(i+1)+' / '+x,list(d.pilot?.steps,5)[i]||'Samen met klant uitwerken')),entry('KPI',list(d.pilot?.kpis,3).join(' / '))),
  page('Wat weten we nog niet?',entry('Procesvolume','Aantallen, doorlooptijden en werkdruk onbekend'),entry('Technische toegang','Systemen, API’s en rechten niet bevestigd'),entry('Datakwaliteit',list(top.flatMap(o=>o.conditions||[]),2).join(' / ')||'Te onderzoeken'),entry('Juridisch en privacy','Doel, grondslag, minimalisatie en beheer toetsen'),entry('Commercieel','Budget, urgentie en beslisser niet bevestigd')),
  page('Voorbereid naar het eerste gesprek.',entry('Vooraf','Kies een hypothese en bereid KPI- en systeemvragen voor'),entry('Tijdens','Valideer knelpunt, eigenaar en passende discovery-opdracht'),entry('Daarna','Werk scope, deliverables, afhankelijkheden en besluitmoment uit'),entry('Bronnenregister',refs(r).join(' / ')||'Externe bronnen nog controleren'))
 ];
}
