import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

// Hindari koneksi ganda saat hot-reload di dev (Next.js)
const globalForDb = globalThis as unknown as { __authDb?: Database.Database };

const db = globalForDb.__authDb ?? new Database(path.join(dataDir, "auth.db"));

if (process.env.NODE_ENV !== "production") {
  globalForDb.__authDb = db;
}

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                TEXT PRIMARY KEY,
    provider          TEXT NOT NULL,
    provider_user_id  TEXT NOT NULL,
    email             TEXT,
    name              TEXT,
    avatar_url        TEXT,
    created_at        INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE (provider, provider_user_id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

export type User = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  provider: "google" | "github";
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  provider: "google" | "github";
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    provider: row.provider,
  };
}

export type UpsertUserInput = {
  provider: "google" | "github";
  providerUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export function upsertUser(input: UpsertUserInput): User {
  const existing = db
    .prepare("SELECT * FROM users WHERE provider = ? AND provider_user_id = ?")
    .get(input.provider, input.providerUserId) as UserRow | undefined;

  if (existing) {
    db.prepare(
      "UPDATE users SET email = COALESCE(?, email), name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?",
    ).run(input.email, input.name, input.avatarUrl, existing.id);
    return toUser(existing);
  }

  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO users (id, provider, provider_user_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, input.provider, input.providerUserId, input.email, input.name, input.avatarUrl);

  return {
    id,
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl,
    provider: input.provider,
  };
}

export function getUserById(id: string): User | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export { db };
