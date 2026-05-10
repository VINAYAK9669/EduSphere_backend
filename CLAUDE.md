# EduSphere Backend — CLAUDE.md

> Repo: `edusphere-backend` · Deployed on: Railway (Node service)
> Part of a 3-service architecture:
>   - edusphere-frontend  (Next.js 14)        → UI layer
>   - edusphere-backend   (Node.js + Express)  → this repo
>   - edusphere-ai        (FastAPI + Python)   → AI microservice

---

## What This Repo Does

All business logic, auth, data access, and API for the platform.
Owns PostgreSQL (Drizzle) and MongoDB (Mongoose).
Proxies AI requests to `edusphere-ai` — the frontend never calls AI directly.
Does NOT do embeddings, RAG, or LLM calls itself.

---

## Repo Structure

```
edusphere-backend/
├── src/
│   ├── index.ts                    # Entry — connects DBs, starts server
│   ├── app.ts                      # Express config — middleware stack
│   │
│   ├── routes/                     # Path + middleware chain only. No logic.
│   │   ├── index.ts                # Mounts all routers
│   │   ├── auth.routes.ts
│   │   ├── admin.routes.ts
│   │   ├── class.routes.ts
│   │   ├── session.routes.ts
│   │   ├── enrollment.routes.ts
│   │   ├── quiz.routes.ts
│   │   ├── assessment.routes.ts
│   │   ├── notes.routes.ts
│   │   └── ai.routes.ts            # Proxy routes to edusphere-ai
│   │
│   ├── controllers/
│   │   ├── admin.controller.ts
│   │   ├── class.controller.ts
│   │   ├── session.controller.ts
│   │   ├── enrollment.controller.ts
│   │   ├── quiz.controller.ts
│   │   ├── assessment.controller.ts
│   │   ├── notes.controller.ts
│   │   └── ai.controller.ts        # Forwards requests to AI service + streams back
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Verifies Better Auth session → req.user
│   │   ├── role.middleware.ts      # requireRole('admin'|'teacher'|'student')
│   │   ├── arcjet.middleware.ts    # Rate limit + bot protection
│   │   ├── validate.middleware.ts  # Zod body validation
│   │   └── error.middleware.ts     # Central error handler — always last
│   │
│   ├── services/
│   │   ├── ai.service.ts           # HTTP client to edusphere-ai (fetch + stream)
│   │   └── storage/
│   │       └── r2.ts               # Cloudflare R2 upload/presign helpers
│   │
│   ├── db/
│   │   ├── postgres/
│   │   │   ├── client.ts           # Drizzle singleton
│   │   │   └── schema/
│   │   │       ├── users.ts
│   │   │       ├── institutions.ts
│   │   │       ├── classes.ts
│   │   │       ├── sessions.ts
│   │   │       ├── enrollments.ts
│   │   │       ├── competencies.ts
│   │   │       ├── assessments.ts
│   │   │       └── notes.ts        # Metadata only — file lives in R2
│   │   └── mongo/
│   │       ├── client.ts           # Mongoose singleton
│   │       └── models/
│   │           ├── Quiz.model.ts
│   │           ├── Attempt.model.ts
│   │           ├── ChatHistory.model.ts
│   │           └── ReflectionReport.model.ts
│   │
│   ├── schemas/                    # Zod schemas for all request bodies
│   │   ├── class.schema.ts
│   │   ├── session.schema.ts
│   │   ├── quiz.schema.ts
│   │   ├── assessment.schema.ts
│   │   └── chat.schema.ts
│   │
│   ├── types/
│   │   └── index.ts                # Shared types + Express req augmentation
│   └── lib/
│       ├── logger.ts               # Pino logger — use this, not console.log
│       └── constants.ts
│
├── drizzle/                        # Auto-generated — DO NOT hand-edit
├── drizzle.config.ts
├── tsconfig.json
├── package.json
├── .env
└── CLAUDE.md
```

---

## Service Communication Map

```
Frontend
  └─► POST /ai/chat/query       ──► ai.controller.ts
  └─► POST /ai/reflection/generate ► ai.controller.ts
           │
           ▼
      ai.service.ts  (HTTP fetch to AI_SERVICE_URL)
           │
           ▼
      edusphere-ai (FastAPI)     ← owns ChromaDB + LangChain + Claude API
```

The backend is a trusted proxy. It:
1. Validates the request (auth + role + Zod)
2. Checks business rules (is student enrolled in this class?)
3. Enriches the request (adds `class_id`, `student_id`, `r2_key` from DB)
4. Forwards to AI service
5. Streams the response back to the frontend

**Never** skip the business rule check before forwarding to AI.

---

## AI Proxy — ai.service.ts

```typescript
// src/services/ai.service.ts
const AI_URL = process.env.AI_SERVICE_URL; // e.g. http://edusphere-ai.railway.internal:8000

export async function proxyToAI(
  path: string,
  payload: Record<string, unknown>
): Promise<Response> {
  const res = await fetch(`${AI_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.AI_INTERNAL_SECRET!, // shared secret — AI validates this
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`AI service error: ${res.status}`);
  return res; // return raw Response for streaming
}

// In controller — pipe the stream directly back to client
export const chatQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Auth + enrollment check already done by middleware
    const { question, noteId } = req.body;
    const note = await getNoteMetadata(noteId); // fetch r2_key, class_id from DB

    // 2. Forward to AI service
    const aiRes = await proxyToAI('/rag/query', {
      question,
      class_id: note.classId,
      note_id: noteId,
    });

    // 3. Stream response back
    res.setHeader('Content-Type', 'text/event-stream');
    aiRes.body!.pipeTo(new WritableStream({
      write(chunk) { res.write(chunk); },
      close() { res.end(); },
    }));
  } catch (err) {
    next(err);
  }
};
```

---

## Middleware Order (mandatory on every protected route)

```typescript
router.post(
  '/ai/chat/query',
  arcjetMiddleware,             // 1. Rate limit (10/min for AI routes)
  authMiddleware,               // 2. Verify session → req.user
  requireRole('student'),       // 3. Role check
  validate(chatQuerySchema),    // 4. Zod body validation
  aiController.chatQuery        // 5. Business rules + proxy to AI
);
```

Never skip any layer. Never inline auth in a controller.

---

## Database Rules

### PostgreSQL (Drizzle)
Relational structured data: users, institutions, subjects, classes, sessions, enrollments, competencies, assessment_responses, notes_metadata.

- Schema changes → `npm run db:generate` → `npm run db:migrate`. Never edit `drizzle/` files by hand.
- Multi-table writes → always `db.transaction(async (tx) => { ... })`.
- Drizzle client singleton from `src/db/postgres/client.ts` only.

### MongoDB (Mongoose)
Flexible document data: quizzes, attempts, chat_histories, reflection_reports.

- Explicit indexes on all query fields: `class_id`, `student_id`, `created_at`.
- `.lean()` on all read-only queries.
- Mongoose singleton from `src/db/mongo/client.ts`. Connect once in `src/index.ts`.

### What goes where

| Data | Database | Reason |
|---|---|---|
| Users, roles, institutions | PostgreSQL | Relational, FK constraints needed |
| Classes, sessions, enrollments | PostgreSQL | Relational |
| Competencies, assessment scores | PostgreSQL | Structured scoring data |
| Notes metadata (r2_key, status) | PostgreSQL | Relational to class |
| Quizzes + questions | MongoDB | Flexible question types |
| Quiz attempts + answers | MongoDB | Variable answer shapes |
| Chat histories | MongoDB | Append-heavy, no joins needed |
| AI reflection reports | MongoDB | Long text, no relations |

---

## API Response Contract

Frontend depends on this shape — never deviate:

```typescript
// Success
{ success: true, data: T }                           // 200
{ success: true, data: T }                           // 201 for creation

// Paginated list
{ success: true, data: T[], pagination: { total, page, limit, totalPages } }

// Error
{ success: false, error: string, details?: unknown } // 400 / 401 / 403 / 404 / 429 / 500
```

Never expose stack traces in error responses.

---

## ArcJet Rate Limits

| Route group | Limit |
|---|---|
| `/auth/*` | 20 req/min per IP |
| `/ai/*` | 10 req/min per IP |
| All others | 60 req/min per IP |

Bot protection: `LIVE` in production, `DRY_RUN` in development.
ArcJet config in `src/middleware/arcjet.middleware.ts` only — never inline in routes.

---

## CORS

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,              // required — session cookies
  methods: ['GET','POST','PUT','PATCH','DELETE'],
}));
```

Never `origin: '*'` — breaks session cookies.

---

## Environment Variables

```bash
PORT=3001
NODE_ENV=development

# Auth
BETTER_AUTH_SECRET=           # must match frontend
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Databases
DATABASE_URL=                 # Neon PostgreSQL (pooled)
MONGODB_URI=                  # MongoDB Atlas

# AI microservice
AI_SERVICE_URL=http://localhost:8000          # edusphere-ai
AI_INTERNAL_SECRET=                           # shared secret for service-to-service auth

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=edusphere-notes
CLOUDFLARE_R2_PUBLIC_URL=

# Security
ARCJET_KEY=
```

---

## Scripts

```bash
npm run dev            # ts-node-dev, port 3001
npm run build          # tsc → dist/
npm run start          # node dist/index.js
npm run type-check     # before every commit
npm run lint
npm run lint:fix
npm run db:generate    # after schema changes
npm run db:migrate
npm run db:studio      # Drizzle Studio, port 4983
npm run db:seed        # demo data
npm run test
```

---

## Startup Order (src/index.ts)

```typescript
async function main() {
  await connectMongo();      // 1. MongoDB
  // PostgreSQL connects lazily on first query — no explicit call needed
  app.listen(PORT, () => logger.info(`Backend on port ${PORT}`));
}
main();
```

---

## What NOT to Do

- No LLM calls, no embeddings, no LangChain in this repo. AI lives in `edusphere-ai`.
- No business logic in route files — routes are path + middleware chain only.
- No mixing Mongo models in Drizzle controllers or vice versa.
- No raw `console.log` — use pino logger from `src/lib/logger.ts`.
- No hand-editing `drizzle/` migration files.
- No `origin: '*'` in CORS.
- No skipping `validate()` middleware on any route with a request body.
- No exposing `AI_INTERNAL_SECRET` or any secret in API responses or logs.
- No committing `.env`.

---

## Git

```
feat: add AI proxy endpoint for RAG chat
fix: add enrollment check before forwarding to AI service
chore: add index to enrollments.student_id
refactor: extract R2 upload to storage service
```

Run `npm run type-check` before committing.

---

## Session Context Hint

When compacting, preserve:
1. Route/controller currently in progress
2. Last Drizzle migration file name
3. Any schema or model recently modified
4. Whether the AI proxy pipe is complete
5. Current roadmap week (1 / 2 / 3 / 4)
