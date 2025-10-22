import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import webpush from "web-push";

// ---- Config di base ----
const app = express();
app.use(
	cors({
		origin: true, // Accetta tutte le origini (solo per development)
		credentials: true,
	})
);
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LowDB (file JSON)
const db = new Low(new JSONFile(path.join(__dirname, "data", "db.json")), {
	users: [],
	messages: [],
	subscriptions: [],
});
await db.read();
db.data ||= { users: [], messages: [], subscriptions: [] };

// JWT super semplice (solo username)
const JWT_SECRET = "dev-secret-change-me";

// Web Push (VAPID)
const VAPID_PUBLIC_KEY =
	"BC77Ljub2gKDeupqE3S2NsM8QrIDHKbIdwQW13NOt-MsVrNor-BUyI15ycoH6_hMbz0WZp7CmLkPwFmAR6vD-o4";
const VAPID_PRIVATE_KEY = "0g5iG-Fbw7zIw2ciK4qUC-TW6YfupeAE3TQmv-ENSzg";
webpush.setVapidDetails(
	"mailto:admin@example.com",
	VAPID_PUBLIC_KEY,
	VAPID_PRIVATE_KEY
);

// ---- Auth middleware ----
function auth(req, res, next) {
	const hdr = req.headers.authorization || "";
	const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
	if (!token) return res.status(401).json({ error: "No token" });
	try {
		req.user = jwt.verify(token, JWT_SECRET);
		next();
	} catch {
		res.status(401).json({ error: "Bad token" });
	}
}

// ---- Endpoints ----

// Login “senza password” solo per demo
app.post("/api/auth/login", async (req, res) => {
	const { username } = req.body;
	if (!username || username.length < 3) {
		return res.status(400).json({ error: "Username troppo corto" });
	}
	const exists = db.data.users.find((u) => u.username === username);
	if (!exists) {
		db.data.users.push({ id: uuid(), username });
		await db.write();
	}
	const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "7d" });
	res.json({ token, username, vapidPublicKey: VAPID_PUBLIC_KEY });
});

// Elenco utenti (esclude te stesso)
app.get("/api/users", auth, async (req, res) => {
	const users = db.data.users
		.filter((u) => u.username !== req.user.username)
		.map((u) => ({ username: u.username }));
	res.json(users);
});

// Lista messaggi con un utente specifico (chat 1:1)
app.get("/api/messages", auth, async (req, res) => {
	const withUser = req.query.with;
	if (!withUser)
		return res.status(400).json({ error: 'Param "with" richiesto' });
	const me = req.user.username;
	const msgs = db.data.messages
		.filter(
			(m) =>
				(m.from === me && m.to === withUser) ||
				(m.from === withUser && m.to === me)
		)
		.sort((a, b) => a.ts - b.ts)
		.slice(-200); // ultimi 200
	res.json(msgs);
});

// Invia messaggio + push
app.post("/api/messages", auth, async (req, res) => {
	const { to, text } = req.body;
	if (!to || !text)
		return res.status(400).json({ error: "to e text richiesti" });

	const msg = {
		id: uuid(),
		from: req.user.username,
		to,
		text,
		ts: Date.now(),
	};
	db.data.messages.push(msg);
	await db.write();
	res.json(msg);

	// invia push al destinatario (se iscritto)
	const subs = db.data.subscriptions.filter((s) => s.username === to);
	const payload = JSON.stringify({
		title: `Nuovo messaggio da ${req.user.username}`,
		body: text,
		data: { from: req.user.username },
	});
	for (const s of subs) {
		try {
			await webpush.sendNotification(s.subscription, payload);
		} catch (e) {
			// pulizia in caso di subscription morta
			if (e.statusCode === 410 || e.statusCode === 404) {
				db.data.subscriptions = db.data.subscriptions.filter(
					(x) => x.id !== s.id
				);
				await db.write();
			} else {
				console.error("Errore push:", e?.statusCode || e?.message);
			}
		}
	}
});

// Salva subscription push del client
app.post("/api/push/subscribe", auth, async (req, res) => {
	const { subscription } = req.body;
	if (!subscription)
		return res.status(400).json({ error: "subscription mancante" });
	// evita duplicati
	const exists = db.data.subscriptions.find(
		(s) =>
			s.username === req.user.username &&
			JSON.stringify(s.subscription) === JSON.stringify(subscription)
	);
	if (!exists) {
		db.data.subscriptions.push({
			id: uuid(),
			username: req.user.username,
			subscription,
		});
		await db.write();
	}
	res.json({ ok: true });
});

// Avvio
const PORT = 3000;
app.listen(PORT, () =>
	console.log(`BE in ascolto su http://localhost:${PORT}`)
);
