import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import webpush from "web-push";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// ---- Config di base ----
const app = express();
app.use(
	cors({
		origin: true, // Accetta tutte le origini (solo per development)
		credentials: true,
	})
);
app.use(express.json());

// Create HTTP server and WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Store active WebSocket connections: username -> WebSocket
const activeConnections = new Map();

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

// ---- WebSocket Handler ----
wss.on('connection', (ws, req) => {
	console.log('🔌 New WebSocket connection attempt');
	
	// Extract token from query params
	const url = new URL(req.url, 'http://localhost:3000');
	const token = url.searchParams.get('token');
	
	if (!token) {
		console.log('❌ No token provided in WebSocket connection');
		ws.close(1008, 'Token required');
		return;
	}

	let username;
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		username = decoded.username;
	} catch (error) {
		console.log('❌ Invalid token in WebSocket connection');
		ws.close(1008, 'Invalid token');
		return;
	}

	console.log(`✅ User ${username} connected via WebSocket`);
	activeConnections.set(username, ws);

	// Send welcome message to confirm connection
	ws.send(JSON.stringify({
		type: 'connected',
		message: 'WebSocket connection established',
		username: username
	}));

	// Handle incoming WebSocket messages
	ws.on('message', async (data) => {
		try {
			const message = JSON.parse(data.toString());
			console.log(`📨 WebSocket message from ${username}:`, message);
			
			if (message.type === 'chat_message') {
				console.log(`💬 Chat message from ${username} to ${message.to}: ${message.text}`);
				
				// Save message to database
				const msg = {
					id: uuid(),
					from: username,
					to: message.to,
					text: message.text,
					ts: Date.now(),
				};
				
				db.data.messages.push(msg);
				await db.write();

				// Send to recipient if they're connected via WebSocket
				const recipientWs = activeConnections.get(message.to);
				if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
					console.log(`🚀 Sending real-time message to ${message.to}`);
					recipientWs.send(JSON.stringify({
						type: 'new_message',
						message: msg
					}));
				} else {
					console.log(`📱 ${message.to} not connected via WebSocket, will try push notification`);
				}

				// Send confirmation back to sender
				ws.send(JSON.stringify({
					type: 'message_sent',
					messageId: msg.id,
					timestamp: msg.ts
				}));

				// Send push notification if recipient is not connected
				if (!recipientWs || recipientWs.readyState !== WebSocket.OPEN) {
					const subs = db.data.subscriptions.filter((s) => s.username === message.to);
					const payload = JSON.stringify({
						title: `Nuovo messaggio da ${username}`,
						body: message.text,
						data: { from: username },
					});
					
					for (const s of subs) {
						try {
							await webpush.sendNotification(s.subscription, payload);
							console.log(`📲 Push notification sent to ${message.to}`);
						} catch (e) {
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
				}
			}
		} catch (error) {
			console.error('💥 Error processing WebSocket message:', error);
		}
	});

	ws.on('close', () => {
		console.log(`🔌 User ${username} disconnected from WebSocket`);
		activeConnections.delete(username);
	});

	ws.on('error', (error) => {
		console.error(`💥 WebSocket error for ${username}:`, error);
		activeConnections.delete(username);
	});
});

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

// Invia messaggio + WebSocket delivery + push fallback
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

	console.log(`📨 HTTP message from ${req.user.username} to ${to}: ${text}`);

	// Try WebSocket delivery first (much more efficient)
	const recipientWs = activeConnections.get(to);
	if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
		console.log(`🚀 Sending real-time message to ${to} via HTTP endpoint`);
		recipientWs.send(JSON.stringify({
			type: 'new_message',
			message: msg
		}));
	} else {
		console.log(`📱 ${to} not connected via WebSocket, sending push notification`);
		
		// Push notification fallback (only when WebSocket not available)
		const subs = db.data.subscriptions.filter((s) => s.username === to);
		const payload = JSON.stringify({
			title: `Nuovo messaggio da ${req.user.username}`,
			body: text,
			data: { from: req.user.username },
		});
		for (const s of subs) {
			try {
				await webpush.sendNotification(s.subscription, payload);
				console.log(`📲 Push notification sent to ${to}`);
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

// Avvio server HTTP + WebSocket
const PORT = 3000;
server.listen(PORT, () =>
	console.log(`🚀 Server (HTTP + WebSocket) running on http://localhost:${PORT}`)
);
