# ProjectAaru — StudyWallah

StudyWallah is a production-grade educational NEET preparation platform backed by a permission-based two-person REST signal/notification architecture (`FREEDOM_PARTNER` / Faculty Desk and `SECRET_PARTNER` / Student Prep).

- **Full-Stack Single-Binary Deployment**: The entire application (Go REST API backend + React/Expo web frontend + embedded static assets) compiles into a **single standalone Linux binary** (`studywallah-server`) using Go's `embed.FS`.
- **Zero Production Node.js Dependency**: Production servers need only **one Go binary** and **one MongoDB instance**. No Node.js, npm, Vercel, Netlify, or separate frontend web server is required.
- **Backend**: Go (`net/http`, HTTP/1.1 over TCP), official MongoDB Go driver, JWT (`HS256`), `bcrypt`.
- **Database**: MongoDB (via Docker Compose or managed cluster bound to `127.0.0.1:27017`).
- **Frontend**: React Native with Expo (JavaScript) compiled for Web (SPA with client-side fallback) and native Android (Expo Go).
- **Transport**: Strictly REST APIs. No WebSockets, MQTT, UDP, sockets, or Firebase.

---

## Architecture Overview

```text
                               +-------------------------------------------------+
                               |         Single Standalone Go Binary             |
                               |             (studywallah-server)                |
                               |                                                 |
  Browser / Client ----------->|  - /api/v1/...        -> Go REST APIs           |
  (Same Origin & Port)         |  - /health, /ready    -> Go Health Probes       |
                               |  - /api/* (unknown)   -> 404 JSON Error (Never) |
                               |  - /_expo/*, /assets  -> Embedded Static Cache  |
                               |  - /, /freedom/*      -> Embedded index.html    |
                               |                          (Client-side SPA)      |
                               +-----------------------+-------------------------+
                                                       |
                                                       v
                                            +---------------------+
                                            |   MongoDB Database  |
                                            |   127.0.0.1:27017   |
                                            +---------------------+
```

---

## Project Structure

```text
ProjectAaru/
├── build.sh                  # Single-command full-stack production build script
├── studywallah-server        # Standalone compiled production Go binary (15 MB)
├── docker-compose.yml        # MongoDB service definition
├── .env.example              # Environment variables template
├── backend/
│   ├── cmd/api/main.go       # Go entry point
│   ├── internal/
│   │   ├── config/           # Environment configuration
│   │   ├── database/         # MongoDB connection & pool
│   │   ├── handlers/         # REST API handlers
│   │   ├── middleware/       # JWT auth, CORS, logging, recovery, timeout
│   │   ├── models/           # Data transfer & domain models
│   │   ├── repository/       # MongoDB & in-memory repositories
│   │   ├── routes/           # Mux router, API catch-all & web integration
│   │   ├── services/         # Business logic
│   │   ├── utils/            # JWT manager & response helpers
│   │   └── web/              # Embedded frontend assets (embed.FS) & handler
│   │       ├── web.go        # Go embed handler with MIME & caching logic
│   │       ├── web_test.go   # Web asset & SPA fallback tests
│   │       └── dist/         # Embedded production web assets (generated)
│   ├── migrations/           # MongoDB unique indexes
│   ├── tests/                # E2E integration test suite
│   └── go.mod
├── frontend/
│   ├── App.js                # React root with web client-side SPA routing
│   ├── app.json
│   ├── assets/               # Batch banners & vector icon assets
│   ├── dist/                 # Web export build output (generated)
│   ├── src/
│   │   ├── components/       # UI cards, daily targets, formulas, buttons
│   │   ├── config/           # Relative /api/v1 config for Web & LAN for mobile
│   │   ├── context/          # Auth context & token persistence
│   │   ├── screens/          # HomeScreen, FreedomDashboardScreen, AuthScreen
│   │   ├── services/         # REST API client & AsyncStorage
│   │   └── theme/            # Color tokens & typography
│   └── package.json
└── README.md
```

---

## Production Build (Single Command)

Build the production React/Expo frontend, copy assets to the Go embed package, and compile the standalone statically-linked binary:

```bash
chmod +x build.sh
./build.sh
```

### What `build.sh` does automatically:
1. Installs frontend dependencies (`npm install`).
2. Bundles production web assets via Expo (`npx expo export --platform web`).
3. Synchronizes the generated `dist/` directory into `backend/internal/web/dist/`.
4. Compiles the Go server with embedded assets:
   ```bash
   CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o studywallah-server ./cmd/api
   ```
5. Produces the `studywallah-server` executable (statically linked ELF, zero shared library dependencies).

---

## Production Deployment & Running

### 1. Prerequisites
- Linux server (Ubuntu, Debian, RHEL, Alpine, etc.)
- MongoDB instance (Docker Compose or managed MongoDB 7+)

### 2. Configure Production Environment

Create or edit `.env` in the same directory as `studywallah-server`:

```bash
# Server Configuration
PORT=8080
HOST=0.0.0.0
APP_ENV=production

# MongoDB Connection
MONGO_URI="mongodb://studywallah_admin:YOUR_STRONG_PASSWORD@127.0.0.1:27017/studywallah?authSource=admin"
MONGO_DB_NAME=studywallah

# Security (generate a 64-char hex key: openssl rand -hex 32)
JWT_SECRET="YOUR_RANDOM_32_PLUS_CHAR_SECRET_KEY"
JWT_EXPIRY_HOURS=168

# Application Settings
INVITATION_EXPIRY_HOURS=24
TIMEZONE="Asia/Kolkata"
REQUEST_TIMEOUT_SECONDS=10
CORS_ALLOWED_ORIGINS="*"
```

### 3. Start MongoDB

If using the included Docker Compose configuration:

```bash
docker compose up -d
docker compose ps
```

### 4. Run the Standalone Server

```bash
./studywallah-server
```

The application is now live on `http://localhost:8080`:
- **StudyWallah NEET Home Screen**: `http://localhost:8080/`
- **Faculty Desk Login**: `http://localhost:8080/freedom/login`
- **Faculty Desk Dashboard**: `http://localhost:8080/freedom/dashboard`
- **Student Batch Activation**: `http://localhost:8080/join`
- **Health Check**: `http://localhost:8080/health`
- **Readiness Check**: `http://localhost:8080/ready`
- **REST APIs**: `http://localhost:8080/api/v1/...`

---

## Rebuilding & Redeploying After Frontend Changes

Whenever you modify any file in `frontend/src/` or `frontend/App.js`:

```bash
# 1. Run the build script
./build.sh

# 2. Restart the server binary (or systemd service)
# If running as a systemd service:
# sudo systemctl restart studywallah
```

No restart of MongoDB is needed. Client browsers automatically pick up the new assets because:
- `index.html` is served with `Cache-Control: no-cache, no-store, must-revalidate`.
- Script and stylesheet chunks (`_expo/static/js/web/...`) have unique content hashes and are served with `Cache-Control: public, max-age=31536000, immutable`.

---

## Running in the Background via systemd (Recommended for Production)

Create `/etc/systemd/system/studywallah.service`:

```ini
[Unit]
Description=StudyWallah Single-Binary Full-Stack Server
After=network.target docker.service

[Service]
Type=simple
User=prpkishan
WorkingDirectory=/home/prpkishan/Documents/ProjectAaru
EnvironmentFile=/home/prpkishan/Documents/ProjectAaru/.env
ExecStart=/home/prpkishan/Documents/ProjectAaru/studywallah-server
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable studywallah
sudo systemctl start studywallah
sudo systemctl status studywallah
```

---

## Development Mode

If you wish to run backend and frontend independently for local live-reload development:

### Terminal 1: Backend
```bash
cd backend
go test -v ./...
go run ./cmd/api
```

### Terminal 2: Expo Metro Dev Server
```bash
cd frontend
npm install
npx expo start
```

- Press `w` to open web browser in development mode.
- Scan QR code with Expo Go app on an Android phone on the same Wi-Fi network.

---

## Verification & Automated Tests

### Run Go Backend & Embedded Web Handler Tests
```bash
cd backend
go test -v -race ./...
```

Tests verify:
1. `GET /` serves `index.html` with `text/html; charset=utf-8` and `no-cache` headers.
2. Client-side SPA routes (`/freedom/login`, `/freedom/dashboard`) fallback to `index.html` on direct browser refresh.
3. Unknown API endpoints (`/api/v1/invalid`, `/api/unknown`) strictly return **JSON 404** errors (never `index.html`).
4. Static assets have appropriate MIME types and immutable caching headers.
5. All REST APIs, JWT authentication, role permission isolation (`403 Forbidden` checks), and signal acknowledgement logic pass without race conditions.
