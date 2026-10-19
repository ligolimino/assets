# Uploadverbinding instellen (eenmalig)

Met deze verbinding kunnen lesgevers op de createpagina een nieuwe opname
toevoegen, zonder GitHub-account. Ze typen alleen een **teamcode**.

```
createpagina  →  Cloudflare Worker (bewaart de sleutel)  →  GitHub: ligolimino/audio
```

**Belangrijk om te weten**

- De Worker kan alleen **nieuwe mp3-bestanden toevoegen** in deze
  repository. Overschrijven, verwijderen of iets in andere repositories
  aanpassen kan niet.
- Werkt de verbinding niet (meer), dan verdwijnen de uploadknoppen
  vanzelf. Alle tools, links en opnames blijven gewoon werken.
- De sleutel van een GitHub App verloopt niet vanzelf. Er is dus geen
  regelmatig beheer nodig.
- Maak alle accounts aan met het **e-mailadres van het ligolimino-account**
  (niet met een persoonlijk adres), zodat een collega het later kan
  overnemen.

Reken op een halfuurtje. Doe de stappen in deze volgorde.

---

## Stap 1. Een GitHub App maken

1. Meld je op github.com aan als **ligolimino**.
2. Klik rechtsboven op je profielfoto → **Settings**.
3. Helemaal onderaan links: **Developer settings** → **GitHub Apps** →
   **New GitHub App**.
4. Vul in:
   - **GitHub App name**: `Letterlab upload ligolimino`
   - **Homepage URL**: `https://ligolimino.github.io/create/`
   - **Webhook**: vink **Active** *uit*.
   - **Permissions → Repository permissions → Contents**: **Read and write**.
     Laat de rest zoals het staat.
   - **Where can this GitHub App be installed?**: **Only on this account**.
5. Klik **Create GitHub App**.
6. Je ziet nu bovenaan het **App ID** (een getal). Noteer het.
7. Scrol naar **Private keys** → **Generate a private key**. Er wordt een
   `.pem`-bestand gedownload. Bewaar het goed: dit is de sleutel.
8. Klik links op **Install App** → **Install** naast ligolimino →
   **Only select repositories** → kies **audio** → **Install**.

## Stap 2. De Worker maken bij Cloudflare

1. Maak een gratis account op `dash.cloudflare.com` (met het
   ligolimino-mailadres).
2. Kies links **Workers & Pages** (soms **Compute (Workers)**) →
   **Create** → **Start with Hello World!**
3. Naam: `letterlab-upload` → **Deploy**.
4. Klik **Edit code**. Verwijder alle code en plak de volledige inhoud van
   `worker.js` (in deze map). Klik **Deploy**.
5. Ga terug naar de Worker → **Settings** → **Variables and Secrets** →
   **Add**. Voeg er drie toe:

| Type | Naam | Waarde |
   |---|---|---|
   | Text | `GITHUB_APP_ID` | het App ID uit stap 1.6 |
   | Secret | `GITHUB_PRIVATE_KEY` | de volledige inhoud van het `.pem`-bestand (open het met Kladblok, alles kopiëren, ook de regels met BEGIN en END) |
   | Secret | `TEAMCODE` | een code die je zelf kiest, bv. `letterlab-2026` |

   Klik **Deploy** (of **Save and deploy**).
6. Bovenaan staat het adres van de Worker, bv.
   `https://letterlab-upload.ligolimino.workers.dev`.

## Stap 3. Testen

Open in je browser het adres van de Worker met `/status` erachter, bv.
`https://letterlab-upload.ligolimino.workers.dev/status`.

- `{"ok":true}`: alles werkt.
- `{"ok":false, ...}`: de uitleg staat bij `detail`. Meestal is het App ID
  fout, is het .pem-bestand niet volledig geplakt, of is de App niet op de
  repository **audio** geïnstalleerd (stap 1.8).

## Stap 4. Het adres in de createpagina zetten

Open `create/index.html` en zoek de regel

```js
const UPLOAD_URL = "";
```

Zet het adres van de Worker tussen de aanhalingstekens (zonder `/status`):

```js
const UPLOAD_URL = "https://letterlab-upload.ligolimino.workers.dev";
```

Push de createpagina. Klaar: bij een woord zonder opname verschijnt nu
**+ Opname toevoegen**, en bij de instructies **+ Nieuwe instructie toevoegen**.

---

## Later

| Wat | Hoe |
|---|---|
| Teamcode veranderen | Cloudflare → Worker → Settings → Variables and Secrets → `TEAMCODE` aanpassen. Collega's typen de nieuwe code één keer. |
| Iemand neemt het beheer over | Geef die persoon toegang tot het ligolimino-account op GitHub en Cloudflare. |
| Uploaden lukt niet meer | Kijk naar `.../status` (stap 3). Ondertussen kan uploaden altijd rechtstreeks via GitHub. |
| Verbinding helemaal uitschakelen | Zet `UPLOAD_URL` in `create/index.html` terug op `""`. |
| Een foute opname weghalen | Rechtstreeks in de repository **audio** op GitHub (de Worker kan niets verwijderen). |

Gratis limiet van Cloudflare: 100.000 aanvragen per dag. Dat is ruim
voldoende.
