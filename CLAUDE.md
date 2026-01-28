# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ESA Verteilte Systeme - Universitäts-Einsendeaufgabe für AIT2/COM503 (Ferdinand Porsche FernFH). Source-only Extrakt aus der Produktivitäts-Werkstatt, demonstriert verteilte Systeme anhand eines Stripe Payment-Flows.

**Stack**: Next.js 15 / TypeScript / React 19

**Vollständiges Projekt**: https://github.com/codeme-ne/die-produktivitaets-werkstatt

## Commands

```bash
# Dev-Server (im vollständigen Projekt)
npm run dev

# Webhook lokal testen
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Stripe Test-Karte: 4242 4242 4242 4242
```

## Architecture

### Payment-Flow (Kernbeispiel)

```
Browser → POST /api/stripe/create-checkout → Stripe API → Checkout URL
              ↓ (User bezahlt bei Stripe)
Stripe  → POST /api/webhook/stripe → Signatur → Idempotenz → Resend Email
```

### Distributed Systems Patterns

| Pattern | File | Mechanism |
|---------|------|-----------|
| **Idempotenz** | `webhookStore.ts` | 3-Phasen: Reserve → Process → Mark (DB oder File+Mutex) |
| **Rate-Limiting** | `rateLimit.ts` | Fixed-Window mit DB/Memory Fallback |
| **HMAC-Signatur** | `webhook/route.ts` | `stripe.webhooks.constructEvent()` |
| **Retry-Handling** | `webhook/route.ts` | HTTP 500 → Stripe retry, 200 → done |

### Idempotenz-Protokoll

```typescript
const reserved = await reserveWebhookEvent(event.id);  // 1. Reserve
if (!reserved) return { duplicate: true };
await sendEmail(...);                                   // 2. Process
await markWebhookProcessed(event.id);                  // 3. Mark
// Bei Fehler: releaseWebhookReservation() → Retry möglich
```

### Dual-Storage Pattern

PostgreSQL in Production (`DATABASE_URL`), File-basiert mit Mutex in Development. Betrifft: `webhookStore.ts`, `rateLimit.ts`.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/webhook/stripe/route.ts` | **Hauptbeispiel**: Webhook mit Signatur, Idempotenz, Email |
| `src/app/api/stripe/create-checkout/route.ts` | Checkout mit Rate-Limit, Zod-Validation, URL-Whitelist |
| `src/libs/webhookStore.ts` | Idempotenz-Store (DB/File Dual-Storage) |
| `src/libs/rateLimit.ts` | Fixed-Window Rate Limiter |
| `src/libs/mutex.ts` | Async Mutex für File-Locking |

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
DATABASE_URL=postgres://...          # Optional, für Produktion
NEXT_PUBLIC_DEV_MODE=1               # Optional, Fake-Checkout ohne Stripe
```

## API Endpoints

| Endpoint | Method | Request Body |
|----------|--------|--------------|
| `/api/stripe/create-checkout` | POST | `{ successUrl, cancelUrl, productType: "live" \| "self-paced" }` |
| `/api/webhook/stripe` | POST | Stripe Event (automatisch) |
