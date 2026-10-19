# Letterlab audio

Alle opnames van Letterlab op één plek. Het dictee, het klik-klakboekje, de
sleepoefening en de flitser zoeken hier eerst.

Online: `https://ligolimino.github.io/audio/...`

## Mappen

| Map | Wat | Voorbeeld |
|---|---|---|
| `klanken/` | losse klanken | `klanken/aa.mp3`, `klanken/ij-ei.mp3` |
| `woorden/<eerste letter>/` | bestaande woorden | `woorden/k/kat.mp3` |
| `woorden/nonsens/` | nonsenswoorden (klik-klakboekje) | `woorden/nonsens/mim.mp3` |
| `instructies/` | instructies; de naam is de tekst | `instructies/Typ het woord.mp3` |
| `zinnen/` | zinnen voor de sleepoefening | `zinnen/de-koffie.mp3` |

## Afspraken over bestandsnamen

- **Woorden**: alleen kleine letters, precies het woord: `kast.mp3`.
- **Zinnen**: kleine letters, geen leestekens, streepjes in plaats van
  spaties: *De koffie is heet!* wordt `de-koffie-is-heet.mp3`.
- **Instructies**: gewoon de tekst, bv. `Zoek het woord.mp3`.
- **Woorden die Windows niet toelaat** (`con`, `prn`, `aux`, `nul`) krijgen
  een liggend streepje achteraan: `woorden/n/nul_.mp3`. De tools weten dat.
- Altijd `.mp3`.

## Nieuwe opnames toevoegen

Het eenvoudigst: op de createpagina (`ligolimino.github.io/create/`). Typ een
woord; staat er **Niet gevonden**, kies dan **+ Opname toevoegen**. Neem op of
kies een bestand, typ de teamcode en klaar. Na een paar minuten werkt de
opname in alle tools.

Die knop verschijnt alleen als de uploadverbinding werkt. Hoe die werkt en
hoe je ze instelt: zie [`upload/HANDLEIDING.md`](upload/HANDLEIDING.md).

Zonder de knop kan het ook: zet het bestand rechtstreeks in de juiste map van
deze repository (via GitHub Desktop, of op github.com met **Add file → Upload
files**).

## Oude mappen

De oude audiomappen in de repositories `klikklak`, `dictee` en `sleepoefening`
blijven bestaan, zodat oudere links (bv. in Genially) altijd blijven werken.
De tools zoeken daar alleen nog als tweede kans.
