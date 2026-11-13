package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
)

func doRequest(t *testing.T, router http.Handler, method, path, token string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func TestEndToEndAPIAndRoleIsolation(t *testing.T) {
	env := newTestEnv(t, 24*time.Hour)

	// 1. Health & Readiness
	if rec := doRequest(t, env.router, http.MethodGet, "/health", "", nil); rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on /health, got %d", rec.Code)
	}
	if rec := doRequest(t, env.router, http.MethodGet, "/ready", "", nil); rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on /ready, got %d", rec.Code)
	}

	// 2. Register Freedom Partner
	regRec := doRequest(t, env.router, http.MethodPost, "/api/v1/auth/register-freedom", "", models.RegisterFreedomRequest{
		Name:     "Aaru Freedom",
		Email:    "aaru.freedom@example.com",
		Password: "Password123!",
	})
	if regRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on register-freedom, got %d body=%s", regRec.Code, regRec.Body.String())
	}
	var freedomAuth models.AuthResponse
	if err := json.Unmarshal(regRec.Body.Bytes(), &freedomAuth); err != nil {
		t.Fatalf("decode freedom auth: %v", err)
	}
	if freedomAuth.Invitation == nil || freedomAuth.Invitation.Code == "" {
		t.Fatal("expected invitation code on freedom registration")
	}

	// 3. Join as Secret Partner
	joinRec := doRequest(t, env.router, http.MethodPost, "/api/v1/auth/join-secret", "", models.JoinSecretRequest{
		Name:           "Aaru Secret",
		Email:          "aaru.secret@example.com",
		Password:       "Password123!",
		InvitationCode: freedomAuth.Invitation.Code,
	})
	if joinRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on join-secret, got %d body=%s", joinRec.Code, joinRec.Body.String())
	}
	var secretAuth models.AuthResponse
	if err := json.Unmarshal(joinRec.Body.Bytes(), &secretAuth); err != nil {
		t.Fatalf("decode secret auth: %v", err)
	}

	// 4. Third user cannot join same pair
	thirdRec := doRequest(t, env.router, http.MethodPost, "/api/v1/auth/join-secret", "", models.JoinSecretRequest{
		Name:           "Intruder",
		Email:          "intruder@example.com",
		Password:       "Password123!",
		InvitationCode: freedomAuth.Invitation.Code,
	})
	if thirdRec.Code != http.StatusConflict {
		t.Fatalf("expected 409 for third user join, got %d body=%s", thirdRec.Code, thirdRec.Body.String())
	}

	// 5. Login as both users
	loginFreedom := doRequest(t, env.router, http.MethodPost, "/api/v1/auth/login", "", models.LoginRequest{
		Email:    "aaru.freedom@example.com",
		Password: "Password123!",
	})
	if loginFreedom.Code != http.StatusOK {
		t.Fatalf("expected 200 on freedom login, got %d", loginFreedom.Code)
	}
	loginSecret := doRequest(t, env.router, http.MethodPost, "/api/v1/auth/login", "", models.LoginRequest{
		Email:    "aaru.secret@example.com",
		Password: "Password123!",
	})
	if loginSecret.Code != http.StatusOK {
		t.Fatalf("expected 200 on secret login, got %d", loginSecret.Code)
	}

	// 6. Cross-role 403 checks
	freedomOnlyPaths := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/freedom/invitation"},
		{http.MethodGet, "/api/v1/freedom/dashboard"},
		{http.MethodGet, "/api/v1/freedom/signals"},
		{http.MethodPost, "/api/v1/freedom/signals/viewed-all"},
	}
	for _, tc := range freedomOnlyPaths {
		rec := doRequest(t, env.router, tc.method, tc.path, secretAuth.Token, nil)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for Secret Partner calling %s %s, got %d", tc.method, tc.path, rec.Code)
		}
	}

	if rec := doRequest(t, env.router, http.MethodPost, "/api/v1/secret/signals", freedomAuth.Token, models.CreateSignalRequest{Content: "test"}); rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for Freedom Partner creating signal, got %d", rec.Code)
	}
	if rec := doRequest(t, env.router, http.MethodGet, "/api/v1/secret/signals/status", freedomAuth.Token, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for Freedom Partner viewing secret status, got %d", rec.Code)
	}

	// 7. Unauthenticated request must return 401
	if rec := doRequest(t, env.router, http.MethodGet, "/api/v1/auth/me", "", nil); rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token, got %d", rec.Code)
	}

	// 8. Secret sends signal -> Secret status is RED and never leaks message content
	secretMessage := "Private Biology NCERT update 99"
	sendRec := doRequest(t, env.router, http.MethodPost, "/api/v1/secret/signals", secretAuth.Token, models.CreateSignalRequest{
		Content: secretMessage,
	})
	if sendRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on create signal, got %d body=%s", sendRec.Code, sendRec.Body.String())
	}

	statusRec := doRequest(t, env.router, http.MethodGet, "/api/v1/secret/signals/status", secretAuth.Token, nil)
	if statusRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on secret status, got %d", statusRec.Code)
	}
	if strings.Contains(statusRec.Body.String(), secretMessage) {
		t.Fatal("secret status endpoint must never return message content")
	}
	var secretStatus models.SecretStatusResponse
	if err := json.Unmarshal(statusRec.Body.Bytes(), &secretStatus); err != nil {
		t.Fatalf("decode secret status: %v", err)
	}
	if secretStatus.Status != models.SignalStatusRed || secretStatus.AllAcknowledged {
		t.Fatalf("expected RED status, got %+v", secretStatus)
	}

	// 9. Freedom dashboard fetches signal, remains RED until Viewed All is clicked
	dashRec := doRequest(t, env.router, http.MethodGet, "/api/v1/freedom/dashboard", freedomAuth.Token, nil)
	if dashRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on freedom dashboard, got %d", dashRec.Code)
	}
	var dash models.FreedomDashboardResponse
	if err := json.Unmarshal(dashRec.Body.Bytes(), &dash); err != nil {
		t.Fatalf("decode dashboard: %v", err)
	}
	if dash.UnreadCount != 1 || dash.TodayTotal != 1 || len(dash.RecentSignals) != 1 || dash.RecentSignals[0].Content != secretMessage {
		t.Fatalf("unexpected dashboard payload: %+v", dash)
	}

	// 10. Pagination endpoint works
	pageRec := doRequest(t, env.router, http.MethodGet, "/api/v1/freedom/signals?page=1&limit=10", freedomAuth.Token, nil)
	if pageRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on paginated signals, got %d", pageRec.Code)
	}

	// 11. Viewed All flips Secret status from RED to GREEN
	ackRec := doRequest(t, env.router, http.MethodPost, "/api/v1/freedom/signals/viewed-all", freedomAuth.Token, nil)
	if ackRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on viewed-all, got %d", ackRec.Code)
	}

	statusAfterRec := doRequest(t, env.router, http.MethodGet, "/api/v1/secret/signals/status", secretAuth.Token, nil)
	var statusAfter models.SecretStatusResponse
	if err := json.Unmarshal(statusAfterRec.Body.Bytes(), &statusAfter); err != nil {
		t.Fatalf("decode secret status after ack: %v", err)
	}
	if statusAfter.Status != models.SignalStatusGreen || !statusAfter.AllAcknowledged || statusAfter.PendingCount != 0 {
		t.Fatalf("expected GREEN status after viewed-all, got %+v", statusAfter)
	}
}
