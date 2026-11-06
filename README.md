# Hablo – Spaans leren

Persoonlijke PWA om Spaans te leren vanaf nul, gericht op zakelijk gebruik, sociaal/partner, eten & drinken, sport en tech.

## Functies
- **10 missies** met elk 4 levels (Woorden 1, Woorden 2, Zinnen, Missietest)
- Oefentypes: meerkeuze (ES→NL / NL→ES), luisteren, zin bouwen met tegels, luisteren & bouwen, typen (met accent-knoppen en tolerantie voor accenten/lidwoorden), paren koppelen
- Spaanse uitspraak via de spraakengine van je toestel (normaal + 🐢 langzaam)
- XP, levels, dagdoel, streak, combo's
- Dagelijkse missies met bonus-XP en prestaties (badges)
- Slim herhalen: zwakke woorden komen terug in herhaalsessies
- Voortgang: XP per dag, nauwkeurigheid per dag, sterkte per missie, lastigste woorden
- Geluidjes (Web Audio), animaties, light/dark mode, werkt offline
- Export/import van voortgang (alles staat lokaal op je toestel)

## Deploy op Vercel
1. Ga naar vercel.com → **Add New → Project** → importeer deze GitHub-repo.
2. Framework preset: **Other**. Geen build command, output directory leeg laten.
3. Deploy. Open de URL op je iPhone in Safari → **Deel → Zet op beginscherm**.

## Content aanpassen
Alle woorden en zinnen staan in `data.js`. Voeg een unit toe of pas de lijsten aan (12 woorden + 8 zinnen per unit).
Verhoog na een update `VERSION` in `sw.js` zodat de cache ververst.

## Lokaal draaien
```
python3 -m http.server 8000
```
