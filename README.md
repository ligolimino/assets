# Letterlab assets

Alle opnames en afbeeldingen van Letterlab op één plek. Het dictee, het
klik-klakboekje, de sleepoefening en de flitser zoeken hier eerst.

Online: `https://ligolimino.github.io/assets/...`

## Mappen

| Map | Wat | Voorbeeld |
|---|---|---|
| `audio/klanken/` | losse klanken | `audio/klanken/aa.mp3`, `audio/klanken/ij-ei.mp3` |
| `audio/woorden/<eerste letter>/` | bestaande woorden | `audio/woorden/k/kat.mp3` |
| `audio/woorden/nonsens/` | nonsenswoorden (klik-klakboekje) | `audio/woorden/nonsens/mim.mp3` |
| `audio/instructies/` | instructies; de naam is de tekst | `audio/instructies/Typ het woord.mp3` |
| `audio/zinnen/` | zinnen en andere opnames met een eigen naam | `audio/zinnen/de-koffie.mp3` |
| `afbeeldingen/` | afbeeldingen (verkleind, meestal WebP) | `afbeeldingen/kat.webp` |
| `upload/` | de uploadverbinding (Cloudflare Worker) en de handleiding | |

## Afspraken over bestandsnamen

- **Woorden**: alleen kleine letters, precies het woord: `kast.mp3`.
- **Zinnen** en **afbeeldingen**: kleine letters, geen leestekens, streepjes
  in plaats van spaties: *De koffie is heet!* wordt `de-koffie-is-heet.mp3`,
  *Rode bal* wordt `rode-bal.webp`.
- **Instructies**: gewoon de tekst, bv. `Zoek het woord.mp3`.
- **Woorden die Windows niet toelaat** (`con`, `prn`, `aux`, `nul`) krijgen
  een liggend streepje achteraan: `audio/woorden/n/nul_.mp3`. De tools weten
  dat.
- Opnames altijd als `.mp3`. Afbeeldingen als `.webp`, `.jpg` of `.png`; in
  een oefening typ je alleen de naam, zonder extensie.

## Nieuwe opnames en afbeeldingen toevoegen

Het eenvoudigst: op de createpagina (`ligolimino.github.io/create/`).

- Bij een woord of zin zonder opname staat **Niet gevonden** met
  **+ Opname toevoegen**: neem op of kies een bestand.
- Bij **Afbeelding** (vrijstaande versie) staat **+ Afbeelding toevoegen**:
  kies of plak een afbeelding. Ze wordt automatisch verkleind (langste zijde
  max. 800 pixels) en omgezet naar WebP, meestal 20 à 80 kB.

Na een paar minuten werkt het nieuwe bestand in alle tools. Die knoppen
verschijnen alleen als de uploadverbinding werkt: zie
[`upload/HANDLEIDING.md`](upload/HANDLEIDING.md).

Zonder de knoppen kan het ook: zet het bestand rechtstreeks in de juiste map
(via GitHub Desktop, of op github.com met **Add file → Upload files**). Doe
in GitHub Desktop altijd eerst **Pull**: elke upload via de createpagina is
een nieuwe commit op GitHub.

## Oude mappen

De oude audio- en afbeeldingenmappen in de repositories `klikklak`, `dictee`
en `sleepoefening` blijven bestaan, zodat oudere links (bv. in Genially)
altijd blijven werken. De tools zoeken daar alleen nog als tweede kans.
