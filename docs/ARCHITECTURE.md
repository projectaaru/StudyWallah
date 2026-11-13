# StudyWallah (ProjectAaru) Architecture & Consistency Guarantees

## 1. System Overview

StudyWallah is a permission-based two-person notification/signal application disguised behind a clean, minimal NEET study companion UI.

- **Transport**: Strictly HTTP/1.1 over TCP (`REST` request-response only). No WebSockets, MQTT, UDP, SSE, or Firebase push listeners. Data refreshes on app open or manual user refresh.
- **Roles**:
  - `FREEDOM_PARTNER`: Registers first, receives a unique single-use invitation code, reads received signals, sees daily (`Asia/Kolkata`) & unread metrics, and manually triggers `Viewed All`.
  - `SECRET_PARTNER`: Registers using a valid invitation code, sends signals, and sees only a server-derived `RED` / `GREEN` aggregate acknowledgement indicator.
- **Role Enforcement**: Every authenticated request verifies the HMAC-SHA256 JWT and reloads the user record from MongoDB via `Authenticate` middleware. `RequireRole(...)` enforces `403 Forbidden` across role boundaries. Roles and `pair_id` supplied by the client are never trusted.

## 2. MongoDB Data Model & Indexes

Collections created and indexed automatically on startup (`backend/migrations/indexes.go`):

1. `users`
   - Unique index: `{ email: 1 }`
2. `pairs`
   - Unique index: `{ freedom_partner_id: 1 }` (one pair per Freedom Partner)
   - Unique partial index: `{ secret_partner_id: 1 }` where `secret_partner_id` is an `ObjectId` (prevents a third user or duplicate Secret Partner from binding to a pair, and prevents a Secret Partner from joining multiple pairs)
3. `invitations`
   - Unique index: `{ code: 1 }`
   - Unique index: `{ pair_id: 1 }`
4. `signals`
   - Compound index: `{ pair_id: 1, created_at: -1 }`
   - Compound index: `{ pair_id: 1, acknowledged: 1, created_at: 1 }`

## 3. Atomic Pairing & Consistency Guarantees

### Replica Set Mode
When MongoDB runs as a replica set, `CreateFreedomPartnerWithPairAndInvitation` and `JoinSecretPartnerWithInvitation` execute inside a MongoDB multi-document ACID transaction (`session.WithTransaction`).

### Standalone MongoDB Mode (Docker Compose Single-Node Default)
Single-node standalone MongoDB instances do not support multi-document transactions (MongoDB error code `20` / `IllegalOperation`). To preserve strong atomicity and race-safety on standalone MongoDB:

1. **Single-use invitation claim**: `JoinSecretPartnerWithInvitation` executes `FindOneAndUpdate` on `invitations` with filter `{ code, used: false, expires_at: { $gt: now } }` setting `{ used: true, used_at: now, used_by: secretUserID }`. MongoDB document-level write locking guarantees **at most one** concurrent request can win this transition.
2. **Exclusive pair binding**: The `pairs` collection is updated via conditional `FindOneAndUpdate` with `{ _id: pairID, secret_partner_id: nil, status: "PENDING" }`, backed by the partial unique index on `secret_partner_id`.
3. **Compensating rollback**: If user insertion (e.g., duplicate email) or pair binding fails after claiming the invitation, the repository immediately rolls back the invitation claim (`used: false`, unsets `used_by`/`used_at`) and cleans up any intermediate user record.

## 4. Concurrent Signal Creation & Viewed All Correctness

- Opening the Freedom Partner dashboard (`GET /api/v1/freedom/dashboard`) or signal list (`GET /api/v1/freedom/signals`) is strictly read-only and never marks signals as acknowledged.
- `POST /api/v1/freedom/signals/viewed-all` captures `cutoff := time.Now().UTC()` and executes an atomic `UpdateMany`:
  - Filter: `{ pair_id: pairID, acknowledged: false, created_at: { $lte: cutoff } }`
  - Update: `{ $set: { acknowledged: true, acknowledged_at: cutoff, acknowledged_by: freedomUserID } }`
- Any signal inserted concurrently *after* `cutoff` has `created_at > cutoff` and remains unacknowledged (`unread_count > 0`, keeping status `RED`).
- Re-running `Viewed All` when nothing is pending matches 0 documents and returns `200 OK` (`acknowledged_count: 0`), making the endpoint idempotent.
