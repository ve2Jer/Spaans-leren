# Hablo – Spaans (castellano) voor Jerry

PWA om Spaans te leren dat je direct gebruikt: op de padelbaan, met Spaanse partners (Prodigy Padel, FEP, distributeurs, clubs) en op reis in Spanje.

## Inhoud (leervolgorde)
1. 🎾 Padel op de baan (standaard startdomein)
2. 📲 Product & data (PadelPlay)
3. 🤝 Zakelijk & deals
4. 🏟️ Evenementen & clubs
5. ✈️ Reizen & sociaal
6. 🏋️ Sport & fitness (Hyrox)
7. ✏️ Mijn woorden (zelf toegevoegd)

240 woorden en zinnen. Elk woord heeft een lidwoord, een vertaling, een voorbeeldzin uit jouw context en audio (stem uit Spanje, es-ES).

## Hoe het leert
- Elk domein is opgedeeld in missies van 8 woorden en 4 zinnen, met 3 levels: **Woorden → Zinnen → Test**.
- Oefeningen: meerkeuze, luisteren, zin bouwen (ES→NL en NL→ES), typen, paren koppelen.
- **Spaced repetition** (Leitner, 7 dozen: nu, 1, 2, 4, 8, 16 en 32 dagen). Een fout antwoord zet het woord terug naar het begin, zodat het vaker terugkomt.
- Instelbaar: niveau (beginner/gevorderd), richting (beide / ES→NL / NL→ES), sessieduur (5 of 10 min), dagdoel.
- Voortgang per domein, geheugendozen, XP per dag, nauwkeurigheid, lastigste woorden.
- XP, levels, streak, dagelijkse missies, prestaties, geluidjes en animaties. Werkt offline.

## Woorden toevoegen
- **In de app:** tab Woorden → ＋. De woorden komen in "Mijn woorden" en in je herhaling.
- **In de code:** `data.js`. Eén regel per woord:
  `la pista | de baan | ¿Reservamos una pista para mañana? | Reserveren we morgen een baan?`
  Verhoog daarna `VERSION` in `sw.js`.

## Deploy op Vercel
Importeer de repo op vercel.com en kies als framework **Other** (geen build). Open de site op je iPhone in Safari en kies **Deel → Zet op beginscherm**.
Tip: installeer op je iPhone de stem "Mónica" (Spaans, Spanje) via Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen.

## Lokaal
`python3 -m http.server 8000`
