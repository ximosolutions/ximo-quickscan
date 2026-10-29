# Ximo Quickscan — Route 1 naar Route 2

Status bijgewerkt: 29 oktober 2026. Dit is een werkchecklist, geen claim dat onderdelen getest of opgeleverd zijn.

## Fase 1 — Stabiliteit
- [x] Basisregressietests aanwezig (6 tests)
- [x] Tests uitgebreid naar 14 scenario's (inclusief sessieherstel)
- [x] GitHub Actions-testworkflow toegevoegd (draait bij push en pull request)
- [ ] Alle tests daadwerkelijk uitvoeren en fouten herstellen
- [ ] Browsercontrole van stappen Start → Onderzoek → Kansen → Rapport
- [ ] Controleren dat wijzigingen eerdere rapportgoedkeuringen ongeldig maken

## Fase 2 — Onderzoeksimport
- [ ] Ongeldige JSON, verkeerd schema en ontbrekende velden testen
- [ ] Gebruikersgerichte foutmeldingen en waarschuwingen verbeteren
- [ ] Duplicaten, bronverwijzingen en kwaliteitsscores controleren

## Fase 3 — Kansenmodule
- [ ] Selecteren, bewerken en herordenen testen
- [ ] Scoreberekening en selectiegrens (3–5) verifiëren
- [ ] Mobiele en toetsenbordbediening nalopen

## Fase 4 — Werk bewaren
- [x] Downloadbaar sessiebestand (JSON) gebouwd
- [x] Sessie-import met schema- en versiecontrole gebouwd; goedkeuringen worden gereset
- [ ] Sessiebestanden end-to-end testen en privacycontrole uitvoeren

## Fase 5 — Route 1 acceptatie
- [ ] Alle geautomatiseerde tests groen
- [ ] Twee complete proefscans met verschillende bedrijven doorlopen
- [ ] Geen blokkerende fouten in import, selectie of export
- [ ] Gebruiker bevestigt dat de workflow praktisch werkt

## Route 2 startcriterium
Route 2 kan starten wanneer fase 1–3 en fase 5 afgerond zijn. Fase 4 is wenselijk maar geen harde blokkade. De PDF-vormgeving blijft buiten scope totdat de gebruiker de eigen ontwerpen aanlevert. Route 2 wordt in dezelfde repository gebouwd, zonder de bestaande Route 1-flow te breken. Startdatum: afhankelijk van acceptatie; er is nog geen betrouwbare kalenderdatum vastgesteld.
