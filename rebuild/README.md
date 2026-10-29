# Ximo Quickscan — schone herbouw

Deze map is de nieuwe applicatiebasis. De bestaande `index.html` blijft tijdens de ontwikkeling ongemoeid. De GitHub Pages-liveversie op `main` verandert niet.

## Ontwerpregels
- Twee routes, één gedeeld kansenmodel en rapportageproces.
- Geen directe AI-API, geen backend, geen localStorage/sessionStorage/cookies voor klantdossiers.
- Route 2: bestaande inventarisatie-JSON + externe onderzoeks-JSON + complete gecombineerde analyse-JSON.
- Geen interne oplossingsvelden in de klantpresentatie: uitsluitend expliciet toegestane klantvelden.
- Financiële indicaties alleen in route 2, met controleerbare bronwaarden, periode en aannames.
- Twee afzonderlijk goedgekeurde PDF's, maximaal 6 slides (16:9) en 10 A4-pagina's, in één ZIP.
- Exact dezelfde zes hoofdstukken in beide rapporten.

## Compatibiliteit
De huidige Ximo Inventarisatie exporteert `{schema:"ximo-inventarisatie",version:1,values:{...},visited:[...]}`.
Het importcontract wordt beheerd in `src/contracts.js`; wijzigingen vereisen contracttests.
Oudere ondersteunde versies mogen niet stilzwijgend veranderen. Onbekende versies worden afgewezen met uitleg.

## Ontwikkelfasen
1. Importcontracten en tests (in uitvoering).
2. Sessiestatus, privacycontrole en routeflows.
3. Gecombineerde analyse, kansenmodel en QA.
4. Financiële rekenmodule met tests.
5. Afzonderlijke PDF-generatoren, previews, goedkeuring en ZIP.
6. End-to-end- en regressietests, daarna expliciete toestemming voor livegang.

De bronbestanden onder `rebuild/` zijn onafhankelijk van de oude Quickscan-code.
