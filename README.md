# MediMap — Personal Health Intelligence Platform

> Transform raw medical reports into longitudinal, actionable health insight — built for patients, not doctors.

---

## The Problem

For the average patient, a medical report is a page of numbers with no context. They don't know what their WBC count means, whether their hemoglobin trend is improving or worsening, or what test they should be doing next. Most people either ignore their reports entirely or misinterpret them without guidance.

Beyond comprehension, there's a storage problem. Reports get lost — buried in WhatsApp chats, scattered across clinic visits, forgotten in folders. When a doctor asks "what were your values six months ago?" the patient has no answer.

The result: patients are passive participants in their own healthcare. They react to crises instead of tracking patterns. They miss follow-up tests. They don't know their risks until it's too late.

India has 77 million diabetics and 220 million hypertension patients, and the average doctor consultation runs under 4 minutes. Patients leave with reports they don't understand and no follow-up plan.

---

## The Solution

MediMap is a personal health intelligence platform that transforms raw medical reports into actionable, longitudinal health insight.

A patient registers once — entering age, height, weight, and existing conditions (diabetes, hypertension, cardiac issues). From that point, every report they upload becomes part of a living health record.

The platform:

- Extracts values from uploaded PDFs and scanned images using Gemini Vision (no Tesseract needed)
- Structures them into a clean parameter table with reference ranges and red/yellow/green risk indicators
- Generates a plain-language AI verdict — what's abnormal, what the risk is, and what to do next
- Tracks every parameter (hemoglobin, WBC, RBC, blood glucose, TSH) across time with line graphs
- Flags missing tests based on the patient's condition profile and tells them when each test is due
- Surfaces relevant specialist doctors in Hyderabad and matches insurance plans to health risk

MediMap doesn't replace doctors. It makes patients informed enough to work with them.

---

## Core Features

| Feature | Description |
|---|---|
| Smart Onboarding | Age, weight, height, existing conditions captured at registration |
| Report Upload & OCR | PDF/image ingestion with structured value extraction via Gemini Vision |
| Parameter Table | Every extracted value shown with reference range + red/yellow/green status |
| AI Health Verdict | Plain-language summary of abnormalities, risks, and next steps |
| Longitudinal Graphs | Per-parameter line graphs across 3M / 6M / 1Y |
| Manual Value Entry | Patient can add or correct OCR-missed values |
| Test Gap Detection | Flags missing tests based on condition profile |
| Next Test Reminder | Tells patient when each test is due again |
| Insurance Matching | Suggests plans based on health risk profile |
| Doctor Discovery | Surfaces relevant specialists in Hyderabad |
| Family Records | Create or join a family group to manage health records together |
| Prescription Scanner | Extract medicine names and dosage from prescription images |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS + Recharts |
| Auth & Database | Supabase (Auth + Postgres + Storage) |
| OCR & Extraction | Gemini Vision API (handles scanned PDFs and images natively) |
| AI Analysis | Groq (Llama 3.3 70B) for verdict generation and test recommendations |
| Secondary AI | Gemini 1.5 Flash for supplementary analysis |
| File Storage | Supabase Storage (`reports` bucket) |

---

## Project Structure

```text
medimap/
+-- src/
¦   +-- app/
¦   ¦   +-- page.tsx                    ? Landing page
¦   ¦   +-- login/page.tsx              ? Sign in
¦   ¦   +-- register/page.tsx           ? Sign up
¦   ¦   +-- onboarding/page.tsx         ? 3-step health profile setup
¦   ¦   +-- dashboard/page.tsx          ? Post-login home
¦   ¦   +-- upload/page.tsx             ? Report upload + AI extraction
¦   ¦   +-- reports/
¦   ¦   ¦   +-- page.tsx                ? Reports vault
¦   ¦   ¦   +-- [id]/page.tsx           ? Per-report analysis view
¦   ¦   +-- health-overview/
¦   ¦   ¦   +-- page.tsx                ? Trends + recommended tests + doctors
¦   ¦   ¦   +-- HealthCharts.tsx        ? Recharts client component
¦   ¦   +-- profile/
¦   ¦   ¦   +-- page.tsx                ? Profile page
¦   ¦   ¦   +-- ProfileEditForm.tsx     ? Editable form client component
¦   ¦   +-- family/page.tsx             ? Family group management
¦   ¦   +-- prescription/page.tsx       ? Prescription scanner
¦   ¦   +-- api/
¦   ¦       +-- upload/route.ts         ? PDF upload + OCR + AI analysis
¦   ¦       +-- reports/route.ts        ? CRUD for reports and values
¦   ¦       +-- auth/register/route.ts  ? Registration endpoint
¦   ¦       +-- family/                 ? Family create/join/leave/respond
¦   ¦       +-- prescription/           ? Prescription scan + medicine lookup
¦   +-- components/
¦   ¦   +-- layout/Sidebar.tsx          ? Shared sidebar navigation
¦   ¦   +-- reports/                    ? Report-related components
¦   ¦   +-- ui/                         ? Shared UI primitives
¦   +-- lib/
¦   ¦   +-- gemini.ts                   ? Gemini API utilities
¦   ¦   +-- llamaService.ts             ? Groq/Llama AI utilities
¦   ¦   +-- healthRecommendations.ts    ? Test gap + insurance logic
¦   ¦   +-- prescriptionParser.ts       ? Medicine extraction helpers
¦   ¦   +-- mockExtraction.ts           ? Dev mode mock OCR output
¦   ¦   +-- supabase/
¦   ¦       +-- client.ts               ? Browser Supabase client
¦   ¦       +-- server.ts               ? Server Supabase client
¦   +-- types/index.ts                  ? Shared TypeScript types
+-- supabase-schema.sql                 ? Core schema (run first)
+-- family-schema.sql                   ? Family tables (run after core schema)
+-- next.config.js
+-- tailwind.config.ts
+-- package.json
```

---

## How It Works

```text
User registers ? /onboarding (saves profile + conditions to Supabase)
       ?
Upload PDF at /upload ? POST /api/upload
       ?
API uploads file to Supabase Storage
Gemini Vision extracts parameter values
Groq/Llama generates AI health verdict
Results saved to Supabase
       ?
User reviews/edits values ? saves ? redirected to /reports/[id]
       ?
Report page: AI summary + abnormal flags + parameter table
       ?
/health-overview: trends across all reports + test gaps + doctor discovery
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- A Google AI Studio account (for Gemini API key)
- A Groq account (for Llama API key)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/medimap.git
cd medimap
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at supabase.com
2. Go to SQL Editor ? paste and run `supabase-schema.sql`
3. Then paste and run `family-schema.sql` (required for family features)
4. Go to Storage ? create a bucket named `reports` and set it to Private
5. Go to Project Settings ? API ? copy your Project URL and anon key

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
USE_MOCK_EXTRACTION=false
```

> Getting your keys:
> 
> - Supabase keys: Project Settings ? API
> - Gemini key: https://aistudio.google.com/app/apikey
> - Groq key: https://console.groq.com/keys

### 5. Run the development server

```bash
npm run dev
```

Open http://localhost:3000

### 6. Build for production

```bash
npm run build
npm run start
```

---

## Development Tips

- **Mock extraction mode:** Set `USE_MOCK_EXTRACTION=true` in `.env.local` to skip real OCR/AI API calls during UI development.
- **Database schema order matters:** Run `supabase-schema.sql` before `family-schema.sql`.
- **Supabase RLS:** Use the service role key in server-side API routes that need to bypass RLS.

---

## License

MIT
