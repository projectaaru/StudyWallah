# StudyWallah Postman Test Flow

Import both files into Postman:
1. `StudyWallah.postman_collection.json`
2. `StudyWallah.postman_environment.json`

## Sequential Verification Flow

Run the collection in order (via Postman Collection Runner or manually step-by-step):

1. **Register Freedom Partner**: `POST /api/v1/auth/register-freedom` — stores `freedomToken` and `invitationCode`.
2. **Obtain Invitation Code**: `GET /api/v1/freedom/invitation` — verifies code matches and `used == false`.
3. **Join as Secret Partner**: `POST /api/v1/auth/join-secret` — pairs with `invitationCode` and stores `secretToken`.
4. **Login as both users**: `POST /api/v1/auth/login` — refreshes tokens for both roles and verifies `GET /api/v1/auth/me` shows `pair_status: "ACTIVE"`.
5. **Send signals from Secret Partner**: `POST /api/v1/secret/signals` and `GET /api/v1/secret/signals/status` — verifies status is `RED` and message content never leaks into `/secret/signals/status`.
6. **Fetch Freedom dashboard**: `GET /api/v1/freedom/dashboard` & `GET /api/v1/freedom/signals` — verifies unread count > 0 and opening dashboard does not mark signals as read.
7. **Click Viewed All**: `POST /api/v1/freedom/signals/viewed-all` — acknowledges pending signals and returns `GREEN`.
8. **Fetch Secret status**: `GET /api/v1/secret/signals/status` — verifies status transitioned from `RED` to `GREEN`.
9. **Role-based access restrictions**: verifies `403 Forbidden` when Secret Partner hits Freedom endpoints and when Freedom Partner hits Secret endpoints.
10. **Third-user protection**: verifies `409 Conflict` (`INVITATION_USED`) when a third user attempts to reuse the invitation code.
11. **Concurrency verification**: run the backend race test suite with `cd backend && go test -race -v ./...`.
