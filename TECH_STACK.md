# Technology Stack

## 1. Confirmed Technologies

### 1.1 Frontend

| Technology | Version / Notes | Purpose |
|---|---|---|
| **React** | Latest stable (v18+) | UI component framework |
| **Vite** | Latest stable (v5+) | Build tool and dev server |
| **JavaScript / TypeScript** | TypeScript (Strict Mode) | Application language |
| **React Leaflet** | Latest stable | Interactive map component wrapping Leaflet.js |
| **Leaflet** | Latest stable | Map rendering engine |
| **OpenStreetMap tiles** | Free tile server | Base map layer (no paid APIs) |
| **React Router** | Latest stable (v6+) | Client-side routing |
| **CSS** | Tailwind CSS | Styling framework |

> **Decision:** TypeScript is the confirmed language. Tailwind CSS is the confirmed styling framework.

### 1.2 Backend & Database

| Technology | Purpose |
|---|---|
| **Supabase** | Backend-as-a-Service: hosted PostgreSQL, REST API, Auth, Row Level Security |
| **PostgreSQL** (via Supabase) | Relational database |
| **Supabase JavaScript Client** (`@supabase/supabase-js`) | Frontend ↔ Supabase communication |
| **Supabase Row Level Security (RLS)** | Database-level access control |

> **Decision:** No separate backend server (Express, Django, Flask, Spring Boot) is used. All data access goes through Supabase's auto-generated REST/PostgREST API.
>
> Supabase Edge Functions are used **only** if a specific server-side requirement (e.g., complex transaction logic that cannot be handled by RPC functions) justifies them.

### 1.3 Map

| Technology | Purpose |
|---|---|
| **React Leaflet** | React wrapper for Leaflet maps |
| **OpenStreetMap tiles** | Free map tiles for the base layer |

> **Rejected:** Google Maps, Mapbox (paid tiers), or any paid routing/directions API.

### 1.4 Deployment

| Platform | Purpose |
|---|---|
| **Vercel** | Frontend hosting (static/SPA deployment) |
| **Supabase Cloud** | Hosted PostgreSQL database and API |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Browser                       │
│  ┌───────────────────────────────────────────┐  │
│  │  React SPA (Vite build)                   │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │ Modules │ │ Leaflet  │ │ Algorithm │  │  │
│  │  │ (CRUD)  │ │ Map      │ │ Engine    │  │  │
│  │  └────┬────┘ └──────────┘ └───────────┘  │  │
│  │       │                                   │  │
│  │       ▼                                   │  │
│  │  Supabase JS Client                      │  │
│  └───────┬───────────────────────────────────┘  │
└──────────┼──────────────────────────────────────┘
           │ HTTPS (REST / PostgREST)
           ▼
┌──────────────────────────────────┐
│  Supabase Cloud                  │
│  ┌────────────┐ ┌─────────────┐ │
│  │ PostgREST  │ │ PostgreSQL  │ │
│  │ API        │ │ Database    │ │
│  └────────────┘ └─────────────┘ │
│  ┌────────────┐ ┌─────────────┐ │
│  │ Auth       │ │ RLS         │ │
│  │ (optional) │ │ Policies    │ │
│  └────────────┘ └─────────────┘ │
│  ┌────────────────────────────┐ │
│  │ Edge Functions (if needed) │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Algorithms run **client-side** in the browser | The TSP instances are small (≤ ~12–15 locations). Client-side execution avoids the need for a backend compute service and allows the UI to display step-by-step algorithm progress. |
| Business rules enforced in **both** frontend and database | Frontend validation provides UX; database constraints and RLS provide integrity. Critical rules (e.g., non-negative stock, unique IDs, foreign keys) are enforced at the database level. |
| No separate backend server | Supabase provides REST API, auth, and RLS. PostgreSQL functions (RPC) handle any server-side logic that needs atomicity. |
| Distance matrix stored in the database | Distances are user-configurable data, not derived from map coordinates. |

---

## 3. Environment Variables

The following environment variables are required:

| Variable | Description | Where Used |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Frontend (Vite exposes `VITE_` prefixed vars) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key | Frontend |

### Variables that must NOT be in frontend code

| Variable | Description | Where Used |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Full-access service-role key | Never in frontend. Only in server-side scripts, migrations, or Edge Functions. |
| `SUPABASE_DB_PASSWORD` | Direct database password | Never in frontend. Only for direct DB connections (migrations, admin). |

> **Critical:** The `service_role` key bypasses RLS. It must **never** appear in client-side JavaScript bundles or be committed to version control.

### `.env.local` Example

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

Add `.env.local` to `.gitignore`.

---

## 4. Security Considerations

### 4.1 Row Level Security (RLS)

- RLS must be **enabled** on all tables.
- Policies must permit the intended operations (read, insert, update, delete) for the application user.
- If no authentication is used (single-operator mode), policies can allow access for the `anon` role with appropriate restrictions.
- If Supabase Auth is added later, policies should be updated to scope access to authenticated users.

### 4.2 Frontend Security

- The `anon` key is designed to be public but must be paired with RLS policies.
- Never expose the `service_role` key.
- Input validation must occur in both frontend (UX) and database (integrity).
- Do not rely solely on hiding a UI button to prevent an action — enforce it in the database.

### 4.3 API Security

- Supabase PostgREST respects RLS policies automatically.
- Use parameterized queries (Supabase client handles this).
- Validate and sanitize user inputs before sending to the API.

---

## 5. Free-Tier Constraints

| Service | Free Tier Limits (approximate, subject to change) |
|---|---|
| **Supabase** | 500 MB database, 1 GB file storage, 2 GB bandwidth, 50,000 monthly active users, 500K Edge Function invocations |
| **Vercel** | 100 GB bandwidth, serverless functions, automatic HTTPS |
| **OpenStreetMap tiles** | Free with fair-use policy (no heavy automated tile scraping) |

The project is designed to operate well within these limits for a demonstration/academic application.

> **Constraint:** Do not introduce any paid API dependency. If a feature requires a paid service, it is out of scope.

---

## 6. Development Tools (Proposed)

| Tool | Purpose |
|---|---|
| **Git** | Version control |
| **VS Code** / IDE of choice | Development |
| **Supabase CLI** (optional) | Local development, migrations, type generation |
| **npm** | Package management |
| **ESLint** (optional) | Code quality |
| **Prettier** (optional) | Code formatting |

---

## 7. Technologies Explicitly Rejected

| Technology | Reason for Rejection |
|---|---|
| Next.js | Not approved; React + Vite is the confirmed stack |
| Vue, Angular, Svelte | Not approved frameworks |
| Express, Django, Flask, Spring Boot | No separate backend server |
| Google Maps API | Paid; out of scope |
| Mapbox (paid tier) | Paid; out of scope |
| Any paid routing/directions API | Cost constraint |
| MongoDB, Firebase | PostgreSQL via Supabase is confirmed |
| Docker / Kubernetes | Unnecessary infrastructure complexity |
| GraphQL | PostgREST (REST) is the default Supabase API |
| Any AI/ML API | Out of scope |

---

## 8. Third-Party Libraries (Proposed)

The following npm packages are anticipated. Final selections will be confirmed during implementation.

| Package | Purpose |
|---|---|
| `react` | UI framework |
| `react-dom` | React DOM renderer |
| `react-router-dom` | Client-side routing |
| `@supabase/supabase-js` | Supabase client |
| `react-leaflet` | React map components |
| `leaflet` | Map engine |
| `react-icons` (proposal) | Icon library |
| `recharts` or `chart.js` (proposal) | Dashboard charts |

> **Note:** Library choices marked as "proposal" are pending confirmation during implementation. The goal is to minimize dependencies.
