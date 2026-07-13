# Parvix Prospect AI - Sales Intelligence Platform

Parvix Prospect AI is a production-grade MVP for a B2B Sales Intelligence Platform. It allows businesses to define an Ideal Customer Profile (ICP), expand it using AI, discover physical/digital buyers (retailers, distributors, wholesalers), qualify them as leads with grounded metrics, and generate tailored outreach.

Designed with strict architectural layering, Swappable Providers, and fully resumable pipelines.

---

## 🛠️ Tech Stack & Key Choices

- **Framework:** Next.js 15+ (App Router) & React 19
- **Style:** TailwindCSS v4 with CSS variables theme (Custom Sleek Dark Mode)
- **Database Layer:** Prisma 7 (using native PostgreSQL driver adapters)
- **AI Core:** OpenAI GPT-4o (structured output validated on receipt with automatic retry)
- **Validation:** Zod schemas shared client/server
- **Rate Limiting:** IP-based lightweight in-memory sliding window
- **Caching:** SHA-256 hashed AI responses cached in `ai_cache` database table

---

## 📁 Key Directories & Architecture

1. **Strict Layering:** `UI (Page/Components) -> API Route Handler -> Service -> Repository/Provider`
2. **Provider Abstraction:** Defined under `lib/ai/provider.interface.ts` and `lib/discovery/provider.interface.ts`. Both support fully swappable implementations (e.g. replacing Apollo/ZoomInfo with `MockDiscoveryProvider` or Gemini/Claude with `OpenAIProvider`).
3. **Resilient Offline fallback:** All database repository & caching layers gracefully fail to mock/in-memory states if PostgreSQL database URL is offline. This ensures the application remains fully interactive and testable immediately after setup.

---

## 🚀 Setup & Execution

### 1. Environment Configuration

Copy the example configuration to `.env`:
```bash
cp .env.example .env
```
Ensure you update:
- `DATABASE_URL` (For Postgres migrations & client runtime adapter connections)
- `OPENAI_API_KEY` (Optional: AI tasks fall back to smart local simulations if missing)

### 2. Database Migration & Seed

Run migrations using the Prisma config setup:
```bash
# Push schema structure to Database
npx prisma db push

# Seed the default user
npx prisma db seed
```

*Note: In Prisma 7, all connection URL strings are configured dynamically via `prisma.config.ts`.*

### 3. Start Development Server

Run the next dev pipeline:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the platform.

---

## 🧪 Pipeline Stages (Verification Guide)

1. **Stage 1 (ICP Expansion):** Input your brand details in `/search/new` form. The platform generates an AI-structured buyer definition card showing targeted segments, exclusions, and reasoning.
2. **Stage 2 (Lead Discovery):** Triggers `MockDiscoveryProvider` to pull target prospects from regional static fixtures (`mocks/companies/*.json`) tagged as `source: "mock"`.
3. **Stage 3 (Lead Qualification):** Bounded concurrency batches run OpenAI completions to score alignments (0-100), identify pain points, opportunities, risks, and recommended buyer roles.
4. **Stage 4 (Outreach Generation):** Generates copyable, highly personalized Emails, LinkedIn request scripts, Cold pitches, and Follow-ups referencing specific matching facts.
5. **Dashboard & CRM:** Complete metrics counters (Total, High-value, Markets Covered), recent searches history logs, CRM Pipeline status updates, and a "CSV Export" download utility.
