# Sora AI Tax Chatbot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org/)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

Sora AI is the **Rwanda tax compliance chatbot** for founders, accountants, and scaling finance teams. It blends trusted guidance from the Rwanda Revenue Authority, regional policy bulletins, and private workspace documents with live web research powered by SearxNG to answer questions with fully cited reasoning. Run it as a hosted Vercel front end paired with a Fly.io SearxNG backend, or deploy everything with Docker.

> 📌 **Why Sora?** We encode Rwanda-specific tax rules, filing calendars, PAYE/VAT calculators, and Electronic Billing Machine (EBM) validation into one workspace so you can ask natural-language questions and stay audit-ready.

<details>
<summary><strong>Table of Contents</strong></summary>

- [Sora AI Tax Chatbot](#sora-ai-tax-chatbot)
  - [Highlights](#highlights)
  - [Assets](#assets)
    - [3. Configure environment](#3-configure-environment)
    - [4. Run locally](#4-run-locally)
    - [5. Seed an admin (optional)](#5-seed-an-admin-optional)
  - [🛳 Deployment](#-deployment)
    - [Vercel (frontend and API)](#vercel-frontend-and-api)
    - [Fly.io (SearxNG backend)](#flyio-searxng-backend)
    - [Docker](#docker)
  - [⚙️ Configuration and Features](#️-configuration-and-features)
    - [Model registry and providers](#model-registry-and-providers)
    - [Focus modes](#focus-modes)
    - [File uploads and embeddings](#file-uploads-and-embeddings)
    - [Admin and analytics](#admin-and-analytics)
    - [APIs](#apis)
  - [🧪 Testing and Quality](#-testing-and-quality)
  - [🗺 Roadmap Highlights](#-roadmap-highlights)
  - [📄 License](#-license)

</details>

## Highlights

- 🇷🇼 **Rwanda-first assists** — PAYE, VAT, withholding, and incentive workflows are tuned for local rules, bilingual documentation, and latest RRA circulars.
- 🔍 **Cited multi-source answers** — Meta search agent combines SearxNG web results, curated regulatory datasets, and your uploaded documents.
- ⚙️ **Bring your models** — Connect OpenAI, Anthropic, Groq, Gemini, Ollama, DeepSeek, LM Studio, or any OpenAI-compatible host; choose per-chat focus and optimization modes.
- 🗂️ **Workspace intelligence** — Upload PDF/DOCX/TXT files, extract structured embeddings, and cross-check filings with inline citations.
- 🧭 **Discover briefings** — Daily tax alerts, policy changes, and macro signals curated for Rwanda and regional markets.
- 🧾 **EBM validator** — Parse invoice PDFs, decode QR payloads, and reconcile seller/buyer TINs and VAT totals.
- 🧑‍💼 **Admin & analytics** — Fine-grained roles (guest, member, editor, admin), usage dashboards, and per-tier rate limits.

## Assets

| Chat Workspace | Tax Briefings | Tax Deadlines |
| --- | --- | --- |
| ![Chat interface showcasing cited answers](.assets/chat_interface.png) | ![Briefings news feed highlighting policy updates](.assets/briefings_news.png) | ![Briefings tab showing tax alerts and deadlines](.assets/briefings_taxupdates.png) |

Captured from the production UI to illustrate the conversational workspace, curated briefings, and compliance timelines available to finance teams.

### 3. Configure environment

Create `.env.local` (or use `.env`) with the following essentials:

```ini
DATABASE_URL=postgres://user:password@host:5432/soraai
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SEARXNG_API_URL=https://your-searx-instance.fly.dev
NEXT_PUBLIC_DEFAULT_CHAT_MODEL_KEY=gpt-4o-mini
FILE_STORAGE_TYPE=vercel-blob
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Additional provider keys can be supplied through environment variables or `openai-compatible.config.json` to auto-register connections at boot.

See [scripts/initial-env.ts](scripts/initial-env.ts) for an interactive helper that lists all supported variables.

### 4. Run locally

```bash
pnpm db:migrate
pnpm dev
```

Visit `http://localhost:3000` and walk through the setup wizard to add at least one chat and embedding model provider.

### 5. Seed an admin (optional)

```bash
SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD=super-secret \
pnpm seed:admin
```

This script promotes the account to the admin role so you can access the analytics dashboard and provider settings.

---

## 🛳 Deployment

### Vercel (frontend and API)

1. Fork or import the repo into Vercel.
2. Set all environment variables under Settings → Environment Variables.
3. Attach a Postgres database (Vercel Postgres, Neon, or external) and storage provider.
4. Enable `pnpm dlx drizzle-kit push` or `pnpm db:migrate` as a Postgres migration step.
5. Redeploy; the setup wizard will run automatically on first launch.

### Fly.io (SearxNG backend)

The `searxng/` directory contains a ready-to-deploy configuration:

```bash
fly launch --copy-config --path searxng
fly secrets set SEARXNG_BASE_URL=https://your-app.vercel.app
fly deploy
```

Ensure JSON output is enabled and engines such as Wolfram Alpha, Reddit, and YouTube remain active. Point `SEARXNG_API_URL` in Vercel to the Fly.io hostname.

### Docker

Bundled image (includes SearxNG):

```bash
docker run -d -p 3000:3000 -p 8080:8080 \
	-e BETTER_AUTH_SECRET=... \
	-e DATABASE_URL=... \
	-v soraai-uploads:/home/soraai/uploads \
	--name soraai \
	rgpartners/soraai:latest
```

Slim image (assumes external SearxNG):

```bash
docker run -d -p 3000:3000 \
	-e SEARXNG_API_URL=https://your-searx-instance \
	-v soraai-uploads:/home/soraai/uploads \
	--name soraai \
	rgpartners/soraai:slim-latest
```

Upgrade instructions live in [docs/installation/UPDATING.md](docs/installation/UPDATING.md).

---

## ⚙️ Configuration and Features

### Model registry and providers

- Manage providers via the setup wizard or Settings → Models.
- Supports OpenAI, Anthropic, Gemini, Groq, DeepSeek, Aiml, LM Studio, Lemonade, Ollama, and any OpenAI-compatible endpoint declared in `openai-compatible.config.json`.
- Default chat provider is persisted per user in browser storage; overrides are resolved server-side in `/api/chat`.

### Focus modes

| Mode | Description |
| --- | --- |
| webSearch | Core mode combining SearxNG with internal KB for cited answers |
| academicSearch | Emphasizes arXiv, PubMed, Google Scholar |
| writingAssistant | Uses prompt templates for drafting with no web search |
| wolframAlphaSearch | Delegates calculations to the Wolfram engine |
| youtubeSearch / redditSearch | Multimedia and community insights |
| ebmValidator | Rwanda EBM receipt validation (flag via `NEXT_PUBLIC_ENABLE_EBM_VALIDATOR`) |

Toggle availability through [src/lib/config/features.ts](src/lib/config/features.ts) or matching environment variables (`NEXT_PUBLIC_ENABLE_*`).

### File uploads and embeddings

- Supported formats: PDF, DOCX, TXT.
- Pipeline: original file → text extraction → chunking (`RecursiveCharacterTextSplitter`) → embeddings stored in object storage.
- Storage driver is defined by `FILE_STORAGE_TYPE` (Vercel Blob by default). Adjust credentials via [src/lib/storage/file-storage/index.ts](src/lib/storage/file-storage/index.ts).

### Admin and analytics

- `/admin/users` lets you filter, paginate, and update user roles.
- `/admin/analytics` surfaces chats per day, active users, provider latency, and error rates aggregated by `usage_events`.
- Rate limits per entitlement tier are defined in [src/lib/entitlements.ts](src/lib/entitlements.ts).

### APIs

Public-facing endpoints mirror the UI capabilities:

- `POST /api/chat` streams chat responses with citations.
- `POST /api/search` offers programmatic access to focus modes (documented in [docs/API/SEARCH.md](docs/API/SEARCH.md)).
- `GET /api/providers` lists available providers and models (after auth).
- `POST /api/suggestions` generates follow-up prompts.
- `POST /api/images` and `POST /api/videos` power media search assistants.
- `GET /api/rates` returns Rwanda BNR rates and inflation digest.
- `GET /api/discover` serves the topic-based news briefing feed with caching.

Full route coverage lives in `src/app/api/`.

---

## 🧪 Testing and Quality

- Type safety: `pnpm check-types`
- Linting: `pnpm lint`
- Formatting: `pnpm format:write`
- End-to-end coverage (coming soon): Playwright scripts in progress

Run `pnpm openai-compatiable:parse` after adding providers to validate configuration.

---

## 🗺 Roadmap Highlights

- Custom collaborative workspaces and shared chat libraries
- Expanded widget library (registrations, PAYE calculator, calendar reminders)
- Deeper ERP integrations (QuickBooks Online, Sage, Xero)
- Multi-tenant billing and usage tiers

---

## 📄 License

Sora AI is released under the MIT License.
