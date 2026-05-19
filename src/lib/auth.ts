import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/postgres/client";
import * as schema from "../db/postgres/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Map our users table. Better Auth creates its own session/account/verification
    // tables — they are separate from src/db/postgres/schema/sessions.ts which
    // is for class sessions, not auth sessions.
    schema: {
      user: schema.users,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
      },
      institutionId: {
        type: "string",
        required: false,
      },
      isLocked: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
});
