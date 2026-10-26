import { mkdir, readFile, writeFile, copyFile, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const destination = process.argv[2] && resolve(process.argv[2]);
if (!destination || destination === root) throw new Error("Choose a new, empty destination directory.");
await mkdir(destination, { recursive: true });
if ((await readdir(destination)).length) throw new Error("Destination must be empty; existing files are never overwritten.");
const feature = "src/features/video-to-variations";
const services = ["api", "captions", "claude-cli", "claude-editor", "connector-api", "connector-auth", "connector-route", "connector-status", "editor-provider", "ffmpeg", "ffmpeg-args", "http", "ingest", "local-gate", "operation-context", "operations", "render", "style", "timeline", "timeline-ops", "transcribe", "workspace"];
const routes = ["", "/health", "/[id]", "/[id]/export", "/[id]/exports/[file]", "/[id]/jobs/[jobId]", "/[id]/media", "/[id]/media/[mediaId]/[file]", "/[id]/prompt", "/[id]/style", "/[id]/timeline", "/[id]/versions/[n]"];
const files = [
  ...services.map((s) => `${feature}/services/${s}.ts`),
  ...routes.map((s) => `src/app/api/video-projects${s}/route.ts`),
  "src/app/api/video-connector/[action]/route.ts", "src/lib/api/respond.ts",
  `${feature}/schemas/project.schema.ts`, `${feature}/schemas/timeline.schema.ts`, `${feature}/types/index.ts`,
  `${feature}/prompts/system.md`, `${feature}/scripts/transcribe.py`, `${feature}/scripts/connector.mjs`,
];
for (const file of files) { await mkdir(dirname(join(destination, file)), { recursive: true }); await copyFile(join(root, file), join(destination, file)); }
async function put(file, content) { await mkdir(dirname(join(destination, file)), { recursive: true }); await writeFile(join(destination, file), content); }
const barrel = await readFile(join(root, feature, "index.ts"), "utf8");
await put(`${feature}/index.ts`, barrel.split("\n").filter((line) => !line.includes("VideoVariationsWorkbench")).join("\n"));
await put("src/types/tool.ts", "export interface RunProgress { done: number; total: number; label: string; }\n");
const app = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const versions = Object.fromEntries(await Promise.all(["next", "react", "react-dom", "zod", "typescript", "@types/node", "@types/react", "@types/react-dom"].map(async (name) => [name, JSON.parse(await readFile(join(root, "node_modules", name, "package.json"), "utf8")).version])));
await put("package.json", JSON.stringify({ name: "leveric-video-connector", version: "1.0.0", private: true, engines: { node: ">=24 <25" }, packageManager: app.packageManager, scripts: Object.fromEntries(Object.entries(app.scripts).filter(([key]) => ["video:connector", "video:connector:build", "video:connector:doctor"].includes(key))), dependencies: Object.fromEntries(["next", "react", "react-dom", "zod"].map((key) => [key, versions[key]])), devDependencies: Object.fromEntries(["typescript", "@types/node", "@types/react", "@types/react-dom"].map((key) => [key, versions[key]])) }, null, 2) + "\n");
await put("next.config.mjs", 'export default { distDir: ".next-video-connector" };\n');
await put("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2017", lib: ["dom", "dom.iterable", "esnext"], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "react-jsx", plugins: [{ name: "next" }], paths: { "@/*": ["./src/*"] } }, include: ["next-env.d.ts", "src/**/*.ts", ".next-video-connector/types/**/*.ts"], exclude: ["node_modules"] }, null, 2));
await put("requirements.txt", "faster-whisper==1.2.1\n");
await put(".gitignore", "node_modules/\n.next-video-connector/\n.env*\n*.tsbuildinfo\nnext-env.d.ts\n");
await put("README.md", `# Leveric video connector\n\nLocal processing companion for https://leveric-workbench.vercel.app/tools/video-to-variations. Follow the Windows/macOS instructions on that page. No GitHub account is needed to clone this repository.\n\nRequires Node 24, pnpm 10.34.7, FFmpeg with subtitle support, ffprobe, Python 3.11 with requirements.txt installed into ~/.video-tools/venv, the cached small speech model, and Claude Code 2.1.310+ signed into your own subscription.\n\nRun pnpm install --frozen-lockfile, pnpm video:connector:build, pnpm video:connector:doctor, then pnpm video:connector. Keep the terminal open and paste its pairing code into the hosted page. Original videos and renders stay local; Claude receives prompts, transcripts and selected frames.\n\nThe connector binds to 127.0.0.1:43127. Projects live under ~/LevericWorkbench/video, outside this checkout. Restart to obtain a new pairing code. Never place provider credentials in this repository or the browser. No external API key is required.\n\nThis is connector-only source exported from an explicit allowlist; no private Workbench history is included. Windows x64 has execution evidence. macOS instructions target Apple Silicon and remain pending full fresh-machine acceptance; Intel is unverified.\n`);
await put("EXPORT-MANIFEST.json", JSON.stringify({ files, generated: ["package.json", "next.config.mjs", "tsconfig.json", "requirements.txt", "README.md", "src/types/tool.ts", `${feature}/index.ts`, ".gitignore"] }, null, 2));
console.log(`Exported ${files.length} allowlisted source files to ${destination}. Generate and include pnpm-lock.yaml before publishing.`);
