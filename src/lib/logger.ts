import fs from "node:fs";
import path from "node:path";

const logDir = path.join(process.cwd(), "data");
const logFile = path.join(logDir, "auth.log");

/**
 * Catat event auth (sukses/gagal) ke console + file data/auth.log.
 * Format: JSON per baris, mudah dibaca & diparse.
 */
export function logAuth(event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...data });
  console.log(`[auth] ${line}`);
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, `${line}\n`);
  } catch (err) {
    console.error("[auth] Gagal menulis log:", err);
  }
}
