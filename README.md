# Flashcards – Glosträning

## Idé

En enkel mobilwebbapp för att träna glosor med flashcards. Användaren bläddrar igenom kort, försöker minnas svaret och markerar om det gick bra eller dåligt.

## Mål

- Fungera bra på mobil (touch-vänligt, responsiv design)
- Enkel och snabb att använda – inga inloggningar eller konton
- Stöd för egna kortlekar
- Spara progress lokalt (localStorage)

## Teknisk stack (föreslagen)

- Ren HTML/CSS/JS – inga ramverk, enkel att deploya
- eller React/Vite om mer komplexitet behövs
- Lagring: localStorage (inga servrar behövs)

## Funktioner att bygga

- [ ] Visa framsida av kort (fråga/glosa)
- [ ] Vänd kortet för att se baksida (svar/översättning)
- [ ] Markera: "Kunde det" / "Kunde det inte"
- [ ] Bläddra igenom en kortlek
- [ ] Lägg till egna kortlekar (JSON-import eller manuellt)
- [ ] Spaced repetition (enkel variant)?

## Status

**Idéfas – inget byggt ännu.**

## Nästa steg

1. Bestäm teknisk stack
2. Designa UI-flödet (hur ser ett session-genomgång ut?)
3. Bygg MVP: en hårdkodad kortlek man kan bläddra igenom
4. Lägg till möjlighet att importera egna lekar
