// ================================================================
// Letterlab upload
// ----------------------------------------------------------------
// Deze kleine 'brievenbus' draait gratis bij Cloudflare Workers.
// De createpagina stuurt er een nieuwe opname naartoe; de Worker zet
// ze in de GitHub-repository ligolimino/audio.
//
// Wat de Worker WEL doet:   een NIEUW mp3-bestand toevoegen.
// Wat de Worker NOOIT doet: een bestaand bestand overschrijven of
//                           verwijderen, of iets buiten de audio-repo.
//
// Instellingen (Cloudflare → Worker → Settings → Variables and Secrets):
//   GITHUB_APP_ID       het App ID van de GitHub App (een getal)
//   GITHUB_PRIVATE_KEY  de volledige inhoud van het .pem-bestand  (secret)
//   TEAMCODE            de code die collega's intypen             (secret)
// Optioneel:
//   GITHUB_OWNER        standaard: ligolimino
//   GITHUB_REPO         standaard: audio
//   ALLOWED_ORIGINS     standaard: https://ligolimino.github.io
//                       (meerdere adressen scheiden met een komma)
//
// Zie HANDLEIDING.md in dezelfde map.
// ================================================================

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB per opname is ruim voldoende.

// Soorten opnames en hun map in de audio-repository.
const KINDS = {
    woord: (name) => `woorden/${name.charAt(0)}/${name}.mp3`,
    nonsens: (name) => `woorden/nonsens/${name}.mp3`,
    instructie: (name) => `instructies/${name}.mp3`,
    zin: (name) => `zinnen/${name}.mp3`,
};

// Namen die Windows niet toelaat ('nul' wordt 'nul_').
const RESERVED_NAMES = ["con", "prn", "aux", "nul"];

export default {
    async fetch(request, env) {
        const cors = corsHeaders(request, env);
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: cors });
        }

        const url = new URL(request.url);
        try {
            if (url.pathname === "/status" && request.method === "GET") {
                // Kan de Worker echt bij de audio-repository? Alleen dan 'ok'.
                await checkRepository(env);
                return json({ ok: true }, 200, cors);
            }
            if (url.pathname === "/code" && request.method === "POST") {
                const body = await request.json();
                if (!(await codeIsRight(body.code, env))) {
                    return json({ ok: false, fout: "Die teamcode klopt niet." }, 403, cors);
                }
                return json({ ok: true }, 200, cors);
            }
            if (url.pathname === "/upload" && request.method === "POST") {
                return await upload(request, env, cors);
            }
            return json({ ok: false, fout: "Onbekend adres." }, 404, cors);
        } catch (error) {
            return json(
                { ok: false, fout: "De verbinding met GitHub lukt niet.", detail: String(error.message || error) },
                503,
                cors,
            );
        }
    },
};

// ------------------------------------------------------------
// Uploaden
// ------------------------------------------------------------

async function upload(request, env, cors) {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ ok: false, fout: "Ongeldige aanvraag." }, 400, cors);
    }

    if (!(await codeIsRight(body.code, env))) {
        return json({ ok: false, fout: "Die teamcode klopt niet." }, 403, cors);
    }

    const kind = String(body.soort || "");
    if (!KINDS[kind]) {
        return json({ ok: false, fout: "Onbekende soort opname." }, 400, cors);
    }

    const name = cleanName(kind, body.naam);
    if (!name) {
        return json({ ok: false, fout: "Die naam kan niet als bestandsnaam." }, 400, cors);
    }

    let bytes;
    try {
        bytes = base64ToBytes(String(body.mp3 || ""));
    } catch {
        return json({ ok: false, fout: "Het bestand is beschadigd." }, 400, cors);
    }
    if (bytes.length < 200 || bytes.length > MAX_BYTES) {
        return json({ ok: false, fout: "De opname is te kort of te groot (max. 3 MB)." }, 400, cors);
    }
    if (!looksLikeMp3(bytes)) {
        return json({ ok: false, fout: "Dit is geen mp3-bestand." }, 400, cors);
    }

    const path = KINDS[kind](name);
    const token = await installationToken(env);
    const api = `https://api.github.com/repos/${owner(env)}/${repo(env)}/contents/${encodePath(path)}`;

    // Bestaat het al? Dan stoppen we: nooit overschrijven.
    const check = await github(api, token, { method: "GET" });
    if (check.status === 200) {
        return json({ ok: false, bestaat: true, pad: path, fout: "Deze opname bestaat al." }, 409, cors);
    }
    if (check.status !== 404) {
        throw new Error(`GitHub antwoordde ${check.status} bij het nakijken.`);
    }

    // Windows ziet 'Typ het woord' en 'typ het woord' als hetzelfde
    // bestand. Daarom kijken we bij instructies ook hoofdletterongevoelig.
    if (kind === "instructie") {
        const folder = await github(
            `https://api.github.com/repos/${owner(env)}/${repo(env)}/contents/instructies`,
            token,
            { method: "GET" },
        );
        if (folder.status === 200) {
            const wanted = `${name}.mp3`.toLowerCase();
            const same = (await folder.json()).find((item) => item.name.toLowerCase() === wanted);
            if (same) {
                return json(
                    { ok: false, bestaat: true, pad: `instructies/${same.name}`, fout: "Deze instructie bestaat al." },
                    409,
                    cors,
                );
            }
        }
    }

    // Zonder 'sha' weigert GitHub zelf ook als het bestand intussen toch
    // bestaat. Zo kan er zelfs bij twee gelijktijdige uploads niets
    // overschreven worden.
    const put = await github(api, token, {
        method: "PUT",
        body: JSON.stringify({
            message: `Nieuwe opname: ${path}`,
            content: bytesToBase64(bytes),
        }),
    });
    if (put.status === 201) {
        return json({ ok: true, pad: path }, 201, cors);
    }
    if (put.status === 422 || put.status === 409) {
        return json({ ok: false, bestaat: true, pad: path, fout: "Deze opname bestaat al." }, 409, cors);
    }
    throw new Error(`GitHub antwoordde ${put.status} bij het opslaan.`);
}

// Maakt van de opgegeven naam een veilige bestandsnaam, of geeft ""
// als dat niet kan.
function cleanName(kind, raw) {
    let name = String(raw || "").normalize("NFC").trim();
    if (kind === "woord" || kind === "nonsens") {
        name = name.toLowerCase();
        if (!/^[a-zà-ÿ]{1,40}$/.test(name)) return "";
        return RESERVED_NAMES.includes(name) ? `${name}_` : name;
    }
    if (kind === "zin") {
        name = name
            .toLowerCase()
            .replace(/[.?!,;:]+$/, "")
            .replace(/[^a-z0-9à-ÿ\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");
        if (!name || name.length > 80) return "";
        return RESERVED_NAMES.includes(name) ? `${name}_` : name;
    }
    // Instructie: gewone tekst, zoals 'Typ het woord'.
    name = name.replace(/\.mp3$/i, "").replace(/\s+/g, " ").replace(/[ .]+$/, "");
    if (!name || name.length > 80) return "";
    if (/[\\/:*?"<>|\u0000-\u001f]/.test(name)) return "";
    if (name.startsWith(".")) return "";
    if (RESERVED_NAMES.includes(name.toLowerCase())) return `${name}_`;
    return name;
}

function looksLikeMp3(bytes) {
    // ID3-label vooraan, of meteen een mp3-frame (11 bits op 1).
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
    return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

// ------------------------------------------------------------
// Teamcode
// ------------------------------------------------------------

async function codeIsRight(given, env) {
    const expected = String(env.TEAMCODE || "");
    if (!expected) return false;
    // Vergelijk de hashes: zo duurt een foute code altijd even lang.
    const [a, b] = await Promise.all([sha256(String(given || "").trim()), sha256(expected.trim())]);
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
    if (diff !== 0) {
        // Een kleine pauze maakt eindeloos raden onaantrekkelijk.
        await new Promise((resolve) => setTimeout(resolve, 800));
    }
    return diff === 0;
}

async function sha256(text) {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// ------------------------------------------------------------
// GitHub App: aanmelden
// ------------------------------------------------------------

// Vraagt de gegevens van de audio-repository op. Lukt dat niet, dan
// werkt de verbinding niet en meldt /status dat ook.
async function checkRepository(env) {
    const api = `https://api.github.com/repos/${owner(env)}/${repo(env)}`;
    let response = await github(api, await installationToken(env), { method: "GET" });
    if (response.status === 401) {
        // Bewaarde sleutel niet meer geldig: één keer een nieuwe vragen.
        cachedToken = null;
        response = await github(api, await installationToken(env), { method: "GET" });
    }
    if (response.status !== 200) {
        throw new Error(`De audio-repository is niet bereikbaar (${response.status}).`);
    }
}

let cachedToken = null; // { token, expires, key }

async function installationToken(env) {
    const key = `${env.GITHUB_APP_ID}|${owner(env)}/${repo(env)}`;
    if (cachedToken && cachedToken.key === key && cachedToken.expires - Date.now() > 5 * 60 * 1000) {
        return cachedToken.token;
    }
    if (!env.GITHUB_APP_ID || !env.GITHUB_PRIVATE_KEY) {
        throw new Error("GITHUB_APP_ID of GITHUB_PRIVATE_KEY ontbreekt.");
    }
    const jwt = await appJwt(env.GITHUB_APP_ID, env.GITHUB_PRIVATE_KEY);

    const found = await github(`https://api.github.com/repos/${owner(env)}/${repo(env)}/installation`, jwt, {
        method: "GET",
        bearer: true,
    });
    if (found.status !== 200) {
        throw new Error(`De GitHub App is niet geïnstalleerd op ${owner(env)}/${repo(env)} (${found.status}).`);
    }
    const installation = await found.json();

    const made = await github(`https://api.github.com/app/installations/${installation.id}/access_tokens`, jwt, {
        method: "POST",
        bearer: true,
        body: JSON.stringify({ repositories: [repo(env)], permissions: { contents: "write" } }),
    });
    if (made.status !== 201) {
        throw new Error(`GitHub gaf geen toegangssleutel (${made.status}).`);
    }
    const data = await made.json();
    cachedToken = { token: data.token, expires: Date.parse(data.expires_at), key };
    return data.token;
}

async function appJwt(appId, pem) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    // 60 seconden terug in de tijd, voor het geval de klokken wat verschillen.
    const payload = { iat: now - 60, exp: now + 9 * 60, iss: String(appId).trim() };
    const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    const key = await importPrivateKey(pem);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
    return `${unsigned}.${base64url(new Uint8Array(signature))}`;
}

// GitHub levert de sleutel als 'RSA PRIVATE KEY' (PKCS#1). De browser-
// cryptografie van Cloudflare wil PKCS#8; die verpakking doen we zelf,
// zodat je het .pem-bestand gewoon kunt plakken.
async function importPrivateKey(pem) {
    const text = String(pem).replace(/\\n/g, "\n");
    const isPkcs1 = /BEGIN RSA PRIVATE KEY/.test(text);
    const body = text
        .replace(/-----BEGIN [A-Z ]+-----/g, "")
        .replace(/-----END [A-Z ]+-----/g, "")
        .replace(/\s+/g, "");
    const der = base64ToBytes(body);
    const attempts = isPkcs1 ? [wrapPkcs1(der)] : [der, wrapPkcs1(der)];
    let lastError;
    for (const candidate of attempts) {
        try {
            return await crypto.subtle.importKey(
                "pkcs8",
                candidate,
                { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                false,
                ["sign"],
            );
        } catch (error) {
            lastError = error;
        }
    }
    throw new Error(`De private key kon niet gelezen worden: ${lastError && lastError.message}`);
}

function wrapPkcs1(pkcs1) {
    const version = Uint8Array.from([0x02, 0x01, 0x00]);
    // SEQUENCE { OID 1.2.840.113549.1.1.1 (rsaEncryption), NULL }
    const algorithm = Uint8Array.from([
        0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
    ]);
    const octet = derElement(0x04, pkcs1);
    return derElement(0x30, concat(version, algorithm, octet));
}

function derElement(tag, content) {
    const length = content.length;
    let lengthBytes;
    if (length < 0x80) {
        lengthBytes = [length];
    } else {
        const bytes = [];
        let rest = length;
        while (rest > 0) {
            bytes.unshift(rest & 0xff);
            rest >>= 8;
        }
        lengthBytes = [0x80 | bytes.length, ...bytes];
    }
    return concat(Uint8Array.from([tag, ...lengthBytes]), content);
}

// ------------------------------------------------------------
// Hulpfuncties
// ------------------------------------------------------------

function owner(env) {
    return (env.GITHUB_OWNER || "ligolimino").trim();
}

function repo(env) {
    return (env.GITHUB_REPO || "audio").trim();
}

function github(url, token, { method, body, bearer }) {
    return fetch(url, {
        method,
        body,
        headers: {
            Authorization: `${bearer ? "Bearer" : "token"} ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "letterlab-upload",
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
    });
}

function corsHeaders(request, env) {
    const allowed = String(env.ALLOWED_ORIGINS || "https://ligolimino.github.io")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const origin = request.headers.get("Origin") || "";
    const headers = {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
    };
    if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
    return headers;
}

function json(data, status, headers) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
}

function encodePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
}

function concat(...parts) {
    const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    parts.forEach((part) => {
        result.set(part, offset);
        offset += part.length;
    });
    return result;
}

function base64ToBytes(base64) {
    const binary = atob(base64.replace(/^data:[^,]*,/, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function base64url(input) {
    const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
    return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
