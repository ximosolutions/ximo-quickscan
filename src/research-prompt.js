const text = x => typeof x === 'string' && x.trim().length > 0;

export function researchPrompt(company, website) {
  if (!text(company) || !text(website)) throw new Error('Bedrijfsnaam en website zijn vereist.');
  const example = {
    schema:'ximo-research',version:2,company:company.trim(),website:website.trim(),
    summary:'Beknopte synthese met feiten, aannames en beperkingen',
    market:[{trend:'Relevante brancheontwikkeling',evidenceType:'feit',sourceRefs:['https://bron.example/onderzoek']}],
    competitors:[{name:'Vergelijkbaar bedrijf',comparison:'Controleerbaar publiek verschil',sourceRefs:['https://bron.example/concurrent']}],
    sources:[{url:'https://bron.example/onderzoek',title:'Titel',publisher:'Uitgever',accessedOn:'YYYY-MM-DD',independent:true}],
    opportunities:[{id:'k1',title:'Kans',painPoint:'Hypothese over pijnpunt',benefits:'Kwalitatieve voordelen',
      impactSummary:'Kwalitatieve impact, geen bedragen',feasibilitySummary:'Haalbaarheid en randvoorwaarden',
      confidence:'middel',evidenceType:'hypothese',verificationNote:'Concrete vraag voor klantgesprek',
      sourceRefs:['https://bron.example/onderzoek'],internalSolution:'Alleen intern: oplossingsrichting',
      scores:{relevance:3,impact:3,feasibility:3,evidence:2}}]
  };
  return [
    'XIMO RESEARCH ENGINE V3 — DIEPGAAND ONDERZOEK | LEES EERST DEZE INSTRUCTIES.',
    'BEDRIJF: '+company.trim()+' | WEBSITE: '+website.trim(),
    '',
    'EINDRESULTAAT: lever een daadwerkelijk downloadbaar, valide UTF-8 JSON-bestand. De bestandsnaam MOET per uitvoering nieuw zijn: YYYYMMDD-HHMMSS-BEDRIJF-ximo-research-XXXXXX.json. YYYYMMDD = echte aanmaakdatum; HHMMSS = echte aanmaaktijd tot op seconden (24 uur); XXXXXX = nieuwe willekeurige reeks van zes kleine letters/cijfers. Gebruik als BEDRIJF: '+(company.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase())+'. Voorbeeldvorm: 20261029-143527-bedrijf-ximo-research-a7k2p9.json (dit is GEEN vaste bestandsnaam). Maak het bestand fysiek met die naam aan, gebruik geen oude bijlage of bestandslink, en controleer dat de download werkt. Als je de actuele klok niet kunt bepalen: gebruik een unieke UUID en vermeld dat. Als bestanden niet gegenereerd kunnen worden: geef het COMPLETE JSON-object in één codeblok als fallback; beweer nooit dat er een bestand is gemaakt als dat niet zo is.',
    '',
    'DOEL: lever grondig, bedrijfsspecifiek extern deskresearch op als basis voor een kwalitatief adviesgesprek over AI en automatisering. Onderzoek eerst, bedenk pas daarna kansen. Geef voorrang aan kwaliteit, concrete aanknopingspunten en verifieerbare signalen boven snelheid en algemene ideeën.',
    'WERKWIJZE: gebruik indien beschikbaar actief webonderzoek, open pagina’s en controleer inhoud en publicatiedatum. Raadpleeg niet uitsluitend zoekresultaatsnippets. Start met de bedrijfswebsite, maar zoek ook actief buiten de website. Controleer bij twijfel of gevonden informatie werkelijk over het juiste bedrijf gaat. Maak nooit bronnen of webtoegang na.',
    'ONDERZOEK 1 — BEDRIJF: bekijk relevante pagina’s over diensten/producten, branches, doelgroepen, vestigingen, contactkanalen, vacatures, nieuws, cases, werkwijze, software/platformen en partners. Leg concrete openbare signalen vast. Als iets niet openbaar te vinden is, zeg dat. Leid geen interne problemen af als feiten.',
    'ONDERZOEK 2 — MARKT: onderzoek minstens vijf relevante zoekrichtingen indien bronnen beschikbaar zijn: (a) sectortrends, (b) administratieve/operationele knelpunten in de branche, (c) klantverwachtingen en communicatie, (d) digitalisering en praktische AI-toepassingen, (e) regelgeving en risico’s. Geef prioriteit aan Nederlandse en recente informatie, maar gebruik oudere primaire bronnen waar passend. Onderbouw iedere trend met een directe URL.',
    'ONDERZOEK 3 — CONCURRENTEN EN VERGELIJKBARE BEDRIJVEN: identificeer waar mogelijk 3–5 echte relevante partijen; beschrijf per partij een aantoonbaar publiek vergelijkingspunt (bijvoorbeeld online intake, selfservice, klantportaal, automatisering of dienstverlening). Verzin geen verschillen of interne systemen. Als geen betrouwbare vergelijking mogelijk is, lever minder partijen en leg de beperking uit.',
    'ONDERZOEK 4 — SIGNALEN EN KANSEN: verbind concrete bedrijfssignalen aan brancheontwikkelingen. Zoek naar kansen rondom communicatie, klantcontact, offerte- en orderstromen, planning, administratie, kennisbeheer, documentverwerking, rapportage en procesoverdracht, maar neem alleen toepasselijke thema’s op. Onderzoek ook minder voor de hand liggende kansen. Vermijd standaardchatbots zonder specifieke aanleiding.',
    'ONDERZOEK 5 — SELECTIE: lever bij voorkeur 6–8 inhoudelijk verschillende kansen, maximaal 8. Alleen minder wanneer bewijs of relevantie tekortschiet. Elke kans bevat een specifieke aanleiding, concreet mogelijk pijnpunt, beoogd resultaat, kwalitatieve impact, haalbaarheid/randvoorwaarden, intern oplossingsidee, verificatievraag en directe bronverwijzingen. Maak expliciet onderscheid tussen feit, afleiding en hypothese. Gebruik geen verzonnen besparingspercentages, ROI, volumes of interne procesbeschrijvingen.',
    'ONDERZOEK 6 — PRIORITERING: ken per kans gehele scores 1–5 toe voor relevance, impact, feasibility en evidence. Weeg de mate van onderbouwing expliciet mee: een aannemelijke hypothese krijgt geen hoge bewijssterktescore zonder direct bewijs. Licht de scorekeuzes kort toe in impactSummary en feasibilitySummary. Rangschik inhoudelijk op waarde en onderbouwing; geen geforceerde gelijke scores.',
    '',
    'BRONNENKWALITEIT: gebruik zoveel mogelijk verschillende primaire en onafhankelijke bronnen. Streef naar minstens 8–12 relevante, daadwerkelijk geraadpleegde URL’s wanneer die bestaan en toegankelijk zijn; dit is een streefgetal, geen reden om bronnen te verzinnen. Vermeld in sources de echte URL, titel, uitgever, geraadpleegde datum en independent:true uitsluitend voor aantoonbaar onafhankelijke bronnen. Iedere sourceRefs-URL bij markt, concurrenten en kansen moet exact terugkomen in sources. Een homepage die niets zegt over een claim is geen onderbouwing.',
    'DIEPGANG: summary bevat een inhoudelijke synthese van activiteiten, klanten, positionering, digitale aanknopingspunten, marktcontext en belangrijke onzekerheden. Market bevat meerdere concrete trends met bronkoppeling. Competitors bevat specifieke vergelijkingen. Opportunities zijn niet generiek, overlappen niet onnodig en sluiten aantoonbaar aan bij het bedrijf. Scheid waarneming, interpretatie en voorstel.',
    'EINDCONTROLE VÓÓR EXPORT: controleer geldige JSON zonder commentaar of markdown, schema ximo-research version 2, unieke kans-IDs, alle vereiste velden, scores 1–5, echte bron-URL’s, correcte sourceRefs, geen voorbeeldbronnen, geen ongefundeerde feiten, en een unieke bestandsnaam met datum + seconden + willekeurige suffix. Als browsen niet beschikbaar is, vermeld de onderzoeksbeperking eerlijk in summary en presenteer aannames als hypothese.',
    'JSON-CONTRACT: gebruik EXACT de onderstaande structuur en veldnamen. Vul velden met relevante inhoud; laat onbekende zaken expliciet als onzekerheid staan. evidenceType is feit, afleiding of hypothese. Het JSON-voorbeeld is uitsluitend structuur: neem GEEN voorbeeldtekst of voorbeeld-URL over.',
    JSON.stringify(example,null,2),
    'Geef na bestandscreatie de EXACTE bestandsnaam en een werkende downloadlink. Geen ZIP of JSONL. Bij onmogelijke bestandscreatie: geef het volledige JSON-object in een codeblok zodat het handmatig als .json kan worden opgeslagen.'
  ].join('\n');
}
