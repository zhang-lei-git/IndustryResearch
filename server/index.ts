import cors from "cors";
import Database from "better-sqlite3";
import express from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(dataDir, "uploads");
mkdirSync(uploadDir, { recursive: true });

const database = new Database(path.join(dataDir, "research.sqlite"));
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS application_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS stored_file (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    relative_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(uploadDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_request, file, callback) => {
      const suffix = path.extname(file.originalname);
      callback(null, `${crypto.randomUUID()}${suffix}`);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 }
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, storage: "sqlite", now: new Date().toISOString() });
});

app.get("/api/state", (_request, response) => {
  const row = database.prepare("SELECT state_json, updated_at FROM application_state WHERE id = 1").get() as { state_json: string; updated_at: string } | undefined;
  response.json(row ? { state: JSON.parse(row.state_json), updatedAt: row.updated_at } : { state: null });
});

app.put("/api/state", (request, response) => {
  if (!request.body || typeof request.body !== "object" || !request.body.state || typeof request.body.state !== "object") {
    response.status(400).json({ error: "state is required" });
    return;
  }
  const updatedAt = new Date().toISOString();
  database.prepare(`
    INSERT INTO application_state (id, state_json, updated_at) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
  `).run(JSON.stringify(request.body.state), updatedAt);
  response.json({ ok: true, updatedAt });
});

app.post("/api/files", upload.single("file"), (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "file is required" });
    return;
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  database.prepare(`
    INSERT INTO stored_file (id, original_name, mime_type, byte_size, relative_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, request.file.originalname, request.file.mimetype, request.file.size, request.file.filename, createdAt);
  response.status(201).json({
    id,
    name: request.file.originalname,
    mimeType: request.file.mimetype,
    size: request.file.size,
    url: `/uploads/${request.file.filename}`,
    createdAt
  });
});

app.listen(3002, "0.0.0.0", () => {
  console.log("Research API listening on http://localhost:3002");
});
