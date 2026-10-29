import {mkdirSync,writeFileSync} from 'node:fs';
import {buildReports} from '../src/report.js';
import {createCustomerPdf,createInternalPdf} from '../src/export.js';
mkdirSync('artifacts/pdf-review',{recursive:true});
for(const scenario of ['compact','extended']){
 const extended=scenario==='extended';
 const opportunities=Array.from({length:extended?10:3},(_,i)=>({
  id:'k'+(i+1),title:['Klantcommunicatie stroomlijnen','Offerteverwerking versnellen','Kennis beter beschikbaar maken','Planning ondersteunen','Documenten structureren','Orderstatus inzichtelijk maken','Rapportages automatiseren','Factuurcontrole','Interne overdracht','Inkomende verzoeken categoriseren'][i],
  selected:i<3,painPoint:'Mogelijke handmatige overdracht in het bedrijfsproces. De feitelijke omvang moet worden getoetst.',
  benefits:'Minder zoekwerk en een beter voorspelbaar proces, mits de gegevens en systemen geschikt zijn.',
  solution:'Een gecontroleerde workflow met menselijke eindcontrole en heldere uitzonderingsafhandeling.',
  example:'Een aanvraag komt binnen, wordt herkend en naar de juiste verantwoordelijke geleid.',
  processSteps:['Ontvangst','Controle','Routering','Menselijke goedkeuring'],
  validationQuestions:['Welke systemen zijn in gebruik?','Hoeveel aanvragen zijn er per week?'],
  verificationNote:'Tijdens intake bevestigen',internalSolution:'INTERN: integratiepatroon en systeemtoegang onderzoeken',
  sourceRefs:['https://example.org/source'],scores:{impact:3,feasibility:3,evidence:2}
 }));
 const research={summary:'Dit is een synthetisch testscenario, geen onderzoek naar een echt bedrijf.',
  sources:[{url:'https://example.org/source',title:'Fictieve testbron'}],
  reportData:{executiveSummary:'De kansen zijn uitsluitend bedoeld om de PDF-weergave en de inhoudsstructuur te controleren.',
   companyFeatures:['Publieke signalen moeten in een echte Quickscan worden geverifieerd.'],
   pilot:{reason:'Kies een klein, meetbaar proces',steps:['Intake','Procesanalyse','Pilot','Evaluatie']},
   closing:'Samen bepalen we welke hypothesen het eerst getoetst worden.'}};
 const pair=buildReports({company:extended?'Demonstratie Organisatie met een Lange Bedrijfsnaam B.V.':'Demo BV',website:'https://example.org',research,opportunities});
 for(const [type,data] of [['customer',createCustomerPdf(pair.customer)],['internal',createInternalPdf(pair.internal)]]){
  writeFileSync('artifacts/pdf-review/'+scenario+'-'+type+'.pdf',data);
 }
}
