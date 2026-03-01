# YAY-89 WebSocket Security (SEC-01) — Design

## Problema

Il WebSocket ttyd è esposto senza autenticazione. Chiunque abbia il browser sulla macchina può aprire una sessione terminale senza conoscere la password (Cross-Site WebSocket Hijacking — CSWSH). Il frontend invia `{ AuthToken: '' }` (stringa vuota) e ttyd accetta qualsiasi connessione.

## Scope

Solo SEC-01: token per sessione. SEC-02 (rate limiting WS) e SEC-03 (idle timeout + re-auth) fuori scope per ora.

## Analisi empirica di ttyd

Test eseguiti su ttyd 1.7.7 (`--credential muzzle:test123`):

| Scenario | Risultato |
|---|---|
| `GET /token` senza auth | corpo vuoto (401) — token NON esposto |
| `GET /token` con `Authorization: Basic base64(muzzle:test123)` | `{"token": "bXV6emxlOnRlc3QxMjM="}` = `base64(muzzle:test123)` |
| WS upgrade senza `Authorization` | `User code denied connection` (401) |
| WS upgrade con `Authorization: Basic base64(muzzle:test123)` | `101 Switching Protocols` ✓ |

ttyd **non** ha un flag `--token`. L'unico meccanismo di auth è `--credential user:pass`.
Il token restituito da `/token` è sempre `base64(user:pass)`.

## Approccio scelto

Per-session random credential via `--credential`. Il frontend la riceve tramite l'endpoint REST JWT-protetto e la usa come URL credentials nel WebSocket URL.

```
Express genera: rawToken = crypto.randomBytes(32).hex   (64 chars)
ttyd spawn:     --credential muzzle:<rawToken>
ttyd log:       credential: base64('muzzle:<rawToken>')

GET /api/sessions/:id/attach   ← richiede Bearer JWT
→ { url: 'http://127.0.0.1:7680', token: rawToken }

Frontend WS URL: ws://muzzle:<rawToken>@127.0.0.1:7680/ws
Browser →        Authorization: Basic base64('muzzle:<rawToken>')
ttyd valida →    101 Switching Protocols

First WS message: { AuthToken: btoa('muzzle:' + rawToken) }
ttyd valida →    terminale attivo
```

## Componenti modificati

| File | Modifica |
|---|---|
| `apps/server/src/services/ttyd.ts` | aggiunge `credential` param, `'--credential', credential` agli args |
| `apps/server/src/services/sessions.ts` | genera `rawToken`, costruisce credential, lo passa a startTtyd, lo salva in `TOKENS` map, lo restituisce in `getSessionAttachUrl` |
| `apps/web/src/app/page.tsx` | stato `ttydToken`, lo riceve dall'API, lo passa a `<Terminal>`, lo pulisce su delete |
| `apps/web/src/components/Terminal.tsx` | prop `token`, costruisce WS URL con URL credentials, invia `AuthToken` nel primo messaggio |

## Threat model

- **CSWSH**: pagina malevola non può ottenere il token (richiede JWT per chiamare l'API Express) → non può aprire WS ✓
- **Token in URL**: accettabile per tool personale; non appare in log server (ttyd 127.0.0.1)
- **Token lifetime**: per-session, eliminato quando la sessione viene cancellata
- **Token rotation**: non implementata (YAGNI per uso personale)

## Fuori scope

SEC-02 (rate limiting messaggi WS), SEC-03 (idle timeout + JWT re-auth), HTTPS nativo (→ YAY-86).
