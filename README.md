# ⚽ Fußball Flashcards

Mobilwebbapp (PWA) för att träna tyska fotbollsglosor via swipe-interaktion. Byggd med ren HTML/CSS/JS och driftsatt på GitHub Pages.

**Live:** https://tom-airaksinen.github.io/fussball-flashcards/

## Funktioner

- **42 glosor** uppdelade i 4 lektioner
- **Swipe höger** = kan ordet, **swipe vänster** = kan inte
- Kortet följer fingret live med rotation – fysisk dragkänsla med snap-back
- **Tryck på kortet** = flippa och se svaret
- **Skaka telefonen** = ångra senaste svep (↩️)
- **Spaced repetition** per riktning: separata index för sv→de och de→sv
- **Progress sparas** lokalt (localStorage), ingen inloggning krävs

## Lektionssystem

Välj en eller flera lektioner att öva på startskärmen:

| # | Lektion | Ord |
|---|---------|-----|
| 1 | Grundläggande | 11 |
| 2 | Regler & situationer | 12 |
| 3 | Spelet | 8 |
| 4 | Match & resultat | 11 |

- Tryck **›** på en lektion för att se alla ord innan du börjar
- **Singel-lektion**: sessionen är klar när du svept höger på alla ord → 🎉 grattis-skärm
- **Flera lektioner**: matchformat med 90 kort

## Teknisk stack

- Ren HTML/CSS/JS – inga ramverk eller byggsteg
- PWA: installerbar på hemskärmen, fungerar offline (service worker)
- GitHub Pages för hosting

## Publicera uppdateringar

```
git add -A && git commit -m "..." && git push
```

GitHub Pages uppdateras automatiskt. PWA-användare får ny version vid nästa appstart.
