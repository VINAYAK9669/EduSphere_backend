# EduSphere Backend — File Structure Guide

A walkthrough of every file and folder: what it is, why it exists, and when you touch it.

---

## Root Files

### `src/index.ts`

**The application entry point.** This is the file Node.js runs first.

Responsibilities:

- Connects to MongoDB (must happen before the server starts)
- Starts the Express HTTP server on the configured port

PostgreSQL (Drizzle) does **not** need an explicit connect call — it connects lazily on the first query.

> Touch this file when: changing startup order, adding a new DB connection, or handling process signals (SIGTERM for graceful shutdown).

---

### `src/app.ts`

**Express app configuration.** Creates and exports the Express app but does NOT start the server.

Responsibilities:

- Registers global middleware (CORS, JSON body parser)
- Mounts the `/api` router
- Registers the error handler (must be last)
- Exposes the `/health` endpoint

Keeping `app.ts` separate from `index.ts` makes the app testable — tests can import `app` without booting the server.

> Touch this file when: adding global middleware, changing CORS config, or adding a top-level route like `/health`.

---

## `src/routes/`

Route files define **path + middleware chain only**. Zero business logic lives here.

### `routes/index.ts`

Central router that mounts every sub-router onto a path prefix. This is the single file that controls the full URL structure of the API.

> Touch this file when: adding a new resource/feature that needs its own router.

---

### `routes/auth.routes.ts`

Handles Better Auth session endpoints (`/api/auth/*`). Better Auth ships its own handler — this file mounts it under the auth rate limit.

> Touch this file when: configuring Better Auth routes or adding auth-adjacent endpoints (e.g. `/auth/me`).

---

### `routes/admin.routes.ts`

Admin-only routes (`/api/admin/*`). Every route here requires `requireRole('admin')`.

> Touch this file when: adding platform management endpoints (user management, institution settings).

---

### `routes/class.routes.ts`

Class CRUD routes (`/api/classes`). Used by teachers to create/manage classes and by students to browse available classes.

> Touch this file when: adding class-level endpoints (archive class, transfer ownership, etc.).

---

### `routes/session.routes.ts`

Session routes nested under a class (`/api/classes/:classId/sessions`). Sessions are individual lessons or meetings within a class.

> Touch this file when: adding session-level endpoints (mark attendance, add resources, etc.).

---

### `routes/enrollment.routes.ts`

Student enrollment routes (`/api/enrollments`). Students enroll themselves; teachers/admins can view enrollment lists.

> Touch this file when: adding unenroll, waitlist, or bulk-enroll endpoints.

---

### `routes/quiz.routes.ts`

Quiz routes nested under a class (`/api/classes/:classId/quizzes`). Teachers create quizzes; students submit attempts.

> Touch this file when: adding quiz export, review, or analytics endpoints.

---

### `routes/assessment.routes.ts`

Competency assessment routes (`/api/classes/:classId/assessments`). Teachers score students against defined competencies.

> Touch this file when: adding bulk assessment, competency summary, or export endpoints.

---

### `routes/notes.routes.ts`

Notes/file routes nested under a class (`/api/classes/:classId/notes`). Teachers upload PDFs; the AI service ingests them for RAG.

> Touch this file when: adding note deletion, re-processing, or download endpoints.

---

### `routes/ai.routes.ts`

AI proxy routes (`/api/ai/*`). These forward validated requests to the `edusphere-ai` FastAPI service.

Rate limit: **10 req/min per IP** (enforced in ArcJet middleware).

> Touch this file when: adding new AI capabilities (summarisation, quiz generation from notes, etc.).

---

## `src/controllers/`

Controllers contain **business logic**: DB queries, rule checks, and response shaping. One controller per resource.

### `controllers/admin.controller.ts`

Platform-wide admin operations: listing users, managing institutions, role changes.

---

### `controllers/class.controller.ts`

Class CRUD logic. Checks that the requesting user is a teacher of the institution before creating a class.

---

### `controllers/session.controller.ts`

Session creation and listing within a class. Validates the teacher owns the parent class.

---

### `controllers/enrollment.controller.ts`

Enrollment logic. Checks the class exists and the student is not already enrolled before inserting.

---

### `controllers/quiz.controller.ts`

Quiz creation and attempt submission. Scores attempts automatically by comparing answers against `correctIndex` stored in MongoDB.

---

### `controllers/assessment.controller.ts`

Competency scoring by teachers. Writes to PostgreSQL (`assessments` table) for structured reporting.

---

### `controllers/notes.controller.ts`

Handles note upload: writes metadata to PostgreSQL (`notes` table) and the file to Cloudflare R2. Sets status to `processing` until the AI service confirms ingestion.

---

### `controllers/ai.controller.ts`

The AI proxy controller. Validates business rules (enrollment check), enriches the request with DB data, then streams the response from `edusphere-ai` directly back to the client.

**Never** skip the enrollment/ownership check before forwarding to AI.

---

## `src/middleware/`

Middleware are reusable request-pipeline stages. Applied in a fixed order on every protected route.

### `middleware/auth.middleware.ts`

Verifies the Better Auth session cookie and populates `req.user` with `{ id, email, role, institutionId }`.

If the session is missing or invalid → `401 Unauthorized`.

> Never inline auth logic in a controller. Always use this middleware.

---

### `middleware/role.middleware.ts`

Guards a route to specific roles. Call as `requireRole('teacher', 'admin')`.

Depends on `authMiddleware` having run first (reads `req.user.role`).

If the role doesn't match → `403 Forbidden`.

---

### `middleware/arcjet.middleware.ts`

Rate limiting and bot protection via ArcJet. Applied as the **first** middleware on every route so bad actors are rejected before any DB or auth work happens.

Rate limits by route group:

- `/auth/*` → 20 req/min
- `/ai/*` → 10 req/min
- All others → 60 req/min

> Touch this file when: changing rate limits or adding bot protection rules.

---

### `middleware/validate.middleware.ts`

Zod schema validation for request bodies. Call as `validate(yourSchema)`.

On failure → `400 Bad Request` with flattened Zod error details.
On success → replaces `req.body` with the parsed, typed data.

> Every route that accepts a request body must use this middleware. No exceptions.

---

### `middleware/error.middleware.ts`

Central error handler. **Must be registered last** in `app.ts`.

Catches anything passed to `next(err)`, logs it with Pino, and returns a safe `500` response. Never exposes stack traces to the client.

---

## `src/services/`

Services are HTTP clients or SDK wrappers. They isolate external dependencies.

### `services/ai.service.ts`

HTTP client that forwards requests to `edusphere-ai`. Attaches the `X-Internal-Secret` header for service-to-service authentication. Returns the raw `Response` object so controllers can stream it directly to the client.

> Touch this file when: adding a new AI endpoint path or changing the auth header.

---

### `services/storage/r2.ts`

Cloudflare R2 helper (S3-compatible). Provides:

- `uploadToR2(key, buffer, contentType)` — uploads a file
- `getPresignedUrl(key, expiresIn)` — generates a temporary download URL

> Touch this file when: adding multipart upload, delete, or copy operations.

---

## `src/db/`

### `db/postgres/client.ts`

Drizzle singleton. Import `db` from here — never create a second Drizzle instance. Uses `@neondatabase/serverless` for Neon's HTTP transport.

---

### `db/postgres/schema/`

Drizzle table definitions. Each file = one table (or a closely related group).

| File              | Table          | Notes                                     |
| ----------------- | -------------- | ----------------------------------------- |
| `users.ts`        | `users`        | Mirrors Better Auth's user table          |
| `institutions.ts` | `institutions` | One institution per school/org            |
| `classes.ts`      | `classes`      | Belongs to a teacher + institution        |
| `sessions.ts`     | `sessions`     | Lessons within a class                    |
| `enrollments.ts`  | `enrollments`  | Student ↔ class join, unique constraint   |
| `competencies.ts` | `competencies` | Rubric items defined per class            |
| `assessments.ts`  | `assessments`  | Teacher scores per student per competency |
| `notes.ts`        | `notes`        | PDF metadata; actual file lives in R2     |

> After editing any schema file: run `npm run db:generate` then `npm run db:migrate`.  
> Never edit the `drizzle/` folder by hand.

---

### `db/postgres/schema/index.ts`

Re-exports all schema tables so `drizzle.config.ts` and `client.ts` can import from a single path.

---

### `db/mongo/client.ts`

Mongoose singleton. Call `connectMongo()` once in `src/index.ts` on startup.

---

### `db/mongo/models/`

Mongoose document models for flexible, document-shaped data.

| File                        | Collection          | Notes                                     |
| --------------------------- | ------------------- | ----------------------------------------- |
| `Quiz.model.ts`             | `quizzes`           | Question bank with variable types         |
| `Attempt.model.ts`          | `attempts`          | Student answers + auto-calculated score   |
| `ChatHistory.model.ts`      | `chathistories`     | Append-heavy message log per student/note |
| `ReflectionReport.model.ts` | `reflectionreports` | AI-generated long-text reports            |

All models have explicit indexes on `class_id`, `student_id`, and `created_at`. Always use `.lean()` on read-only queries.

---

## `src/schemas/`

Zod schemas define the **shape of incoming request bodies**. They are the source of truth for input validation and are also used to derive TypeScript types.

| File                   | Used by                                               |
| ---------------------- | ----------------------------------------------------- |
| `class.schema.ts`      | `POST /classes`, `PATCH /classes/:id`                 |
| `session.schema.ts`    | `POST /classes/:classId/sessions`                     |
| `quiz.schema.ts`       | `POST /classes/:classId/quizzes`, `POST .../attempt`  |
| `assessment.schema.ts` | `POST /classes/:classId/assessments`                  |
| `chat.schema.ts`       | `POST /ai/chat/query`, `POST /ai/reflection/generate` |

> Touch these files when: adding or changing request fields. Changing a schema here automatically propagates type safety to the controller.

---

## `src/types/index.ts`

Shared TypeScript types and Express augmentations. Defines `AuthUser` and adds `req.user` to Express's `Request` interface globally so every controller gets type-safe access to the authenticated user.

> Touch this file when: adding new fields to `req.user` or defining types shared across multiple files.

---

## `src/lib/`

### `lib/logger.ts`

Pino logger singleton. Use `logger.info()`, `logger.error()`, etc. everywhere instead of `console.log`.

In development it uses `pino-pretty` for human-readable output. In production it emits structured JSON for log aggregators.

---

### `lib/constants.ts`

App-wide constants derived from environment variables (`PORT`, `NODE_ENV`, `IS_PROD`). Import from here instead of reading `process.env` directly in business logic.

---

## Config Files

### `tsconfig.json`

TypeScript compiler config. Key settings:

- `"module": "Node16"` + `"moduleResolution": "node16"` — modern Node.js module resolution (non-deprecated)
- `"strict": true` — full type safety
- `"outDir": "dist"` — compiled output folder

---

### `drizzle.config.ts`

Drizzle Kit config. Points to the schema folder and the Neon `DATABASE_URL`. Used by all `npm run db:*` commands.

---

### `.env.example`

Template of all required environment variables with empty values. Commit this — never commit `.env`.

---

## Mandatory Route Middleware Order

Every protected route must follow this exact order:

```
arcjetMiddleware     ← 1. Reject abusers before any work
authMiddleware       ← 2. Verify session, populate req.user
requireRole(...)     ← 3. Check permission
validate(schema)     ← 4. Validate + parse request body
controller           ← 5. Business logic
```

Skipping any layer is a bug.
