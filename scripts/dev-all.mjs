/**
 * Runs the full local multiplayer stack with one command:
 *
 *   npm run dev:all
 *
 * - Next.js frontend  → http://localhost:3000
 * - Realtime Worker   → http://127.0.0.1:8787 (owns rooms + WebSockets)
 *
 * No database required. Online Create/Join/Move flows need BOTH processes;
 * `npm run dev` alone is fine for local/bot play.
 */
import { spawn } from "node:child_process";

const jobs = [
  { name: "web", command: "npm", args: ["run", "dev"] },
  { name: "realtime", command: "npx", args: ["wrangler", "dev", "--port", "8787"] },
];

const children = jobs.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: process.env,
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    console.error(`[${name}] exited with code ${code ?? "unknown"}`);
  });
  return child;
});

const shutdown = () => {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
  }
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
