# Whisper Web 💌

**Whisper Web** is a tiny anonymous message board for sending and viewing short "whispers." It uses Supabase for storage and realtime updates and includes a scheduled AI moderation worker that removes flagged messages automatically.

---

## 🔍 What this app does

- Send anonymous or nicknamed short messages (`whispers`) from the frontend (`index.html`).
- View the message gallery in `chats.html` with realtime updates.
- Client-side bad-word filtering (from a `bad_words` Supabase table).
- Server-side AI moderation: a Node.js cron job (`moderation_filter_app/index.js`) calls Google Gemini to detect violations and deletes offending rows from the `whispers` table.

---

## 🧩 Architecture / components

- Frontend: `index.html`, `chats.html` — static HTML/JS using the Supabase JS client.
- Moderation worker: `moderation_filter_app/index.js` — polls Supabase (every 5 minutes) and uses Gemini to decide deletions.
- Utility: `moderation_filter_app/delete.js` — example/test delete flow.
- Database tables used (Supabase): `whispers`, `bad_words`.

---

## ⚙️ Quick start

1. Clone/open the repo.

2. Serve the frontend (any static server):
   - Open `index.html` directly in a browser, or
   - Run a quick server: `npx http-server . -p 3000` (or `python -m http.server 3000`).

3. Run the moderation worker:
   ```bash
   cd moderation_filter_app
   npm install
   node index.js
   ```
   - The worker runs an initial moderation pass immediately and then every 5 minutes.

4. (Optional) Run the delete test utility:
   ```bash
   node delete.js
   ```
   - Edit `delete.js` to set the `idToDelete` value you want to test.

---

## 🔐 Environment variables

Create a `.env` file for the moderation worker with the following variables:

```
SUPABASE_URL=https://<your-supabase>.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>   # KEEP SECRET
TABLE_NAME=whispers
GEMINI_API_KEY=<your-google-gemini-key>
```

Notes:
- `SUPABASE_SERVICE_KEY` must be a service_role key because the worker needs delete privileges.
- Do NOT commit `.env` or service_role keys to source control.

---

## 🧠 How moderation works (short)

1. Frontend inserts a sanitized `message` into the `whispers` table.
2. `moderation_filter_app/index.js` fetches recent messages and sends them to Gemini (model: `gemini-3-flash-preview`) with a strict moderation prompt.
3. Gemini returns JSON with `delete_ids`.
4. The worker deletes flagged rows using the Supabase service key.

---

## ✅ Security & privacy notes

- The frontend currently contains a public Supabase anon key in `index.html`/`chats.html` for demo purposes. This exposes only *public* access by design — do not use the service_role key in client code.
- For production, enforce Row Level Security (RLS) and move sensitive operations (deletes, moderation) to server-side code or Supabase Edge Functions.
- Sanitize user input server-side in addition to the client-side checks.

---

## 🧪 Database schema (examples)

- `whispers` table: `id (pk)`, `nickname`, `message`, `created_at`
- `bad_words` table: `word`, `pattern` (optional regex)

Example `bad_words` row:
```sql
INSERT INTO bad_words (word, pattern) VALUES ('badword', NULL);
```

---

## ♻️ Recommended improvements

- Add server-side API with proper auth for writes and moderation triggers.
- Add tests and CI for the moderation worker.
- Rate limit submissions and add spam detection.
- Replace client-exposed keys with secure server endpoints or Edge Functions.

---

## 📁 Useful files

- `index.html` — send whispers
- `chats.html` — gallery + realtime subscription
- `moderation_filter_app/index.js` — AI moderation cron job
- `moderation_filter_app/delete.js` — delete test utility

---

## 📜 License

This project uses the same license as the workspace (`ISC`).

---

If you'd like, I can add a `.env.example` file, a `start` script for the moderation app, or an entry explaining how to enable RLS in Supabase. 💡
