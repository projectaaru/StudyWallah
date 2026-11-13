package routes_test

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/repository"
	"github.com/projectaaru/studywallah-backend/internal/routes"
	"github.com/projectaaru/studywallah-backend/internal/services"
	"github.com/projectaaru/studywallah-backend/internal/utils"
)

func newTestRouter(t *testing.T) http.Handler {
	t.Helper()
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}

	repo := repository.NewMemoryRepository()
	jwtMgr := utils.NewJWTManager("test-secret-key-at-least-32-characters-long", 24*time.Hour)
	authSvc := services.NewAuthService(repo, jwtMgr, 24*time.Hour)
	freedomSvc := services.NewFreedomService(repo, loc, "Asia/Kolkata")
	secretSvc := services.NewSecretService(repo)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	return routes.NewRouter(routes.Dependencies{
		Repo:           repo,
		JWTManager:     jwtMgr,
		AuthService:    authSvc,
		FreedomService: freedomSvc,
		SecretService:  secretSvc,
		Logger:         logger,
		RequestTimeout: 5 * time.Second,
		CORSOrigins:    []string{"*"},
	})
}

func TestRouter_APICatchAllNeverReturnsHTML(t *testing.T) {
	router := newTestRouter(t)

	unknownPaths := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/non-existent-endpoint"},
		{http.MethodPost, "/api/v1/invalid-route"},
		{http.MethodGet, "/api/v1/secret/nonexistent"},
		{http.MethodGet, "/api/unknown"},
	}

	for _, tc := range unknownPaths {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404 on %s %s, got %d", tc.method, tc.path, rec.Code)
		}

		contentType := rec.Header().Get("Content-Type")
		if !strings.HasPrefix(contentType, "application/json") {
			t.Fatalf("expected application/json on %s %s, got %q", tc.method, tc.path, contentType)
		}

		var errResp models.ErrorResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("failed decoding json error response on %s %s: %v, body=%s", tc.method, tc.path, err, rec.Body.String())
		}

		if errResp.Error.Code != "NOT_FOUND" {
			t.Fatalf("expected error code NOT_FOUND, got %q", errResp.Error.Code)
		}
	}
}

func TestRouter_WebAndAPIIntegration(t *testing.T) {
	router := newTestRouter(t)

	// 1. Root serves HTML
	rootReq := httptest.NewRequest(http.MethodGet, "/", nil)
	rootRec := httptest.NewRecorder()
	router.ServeHTTP(rootRec, rootReq)
	if rootRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on /, got %d", rootRec.Code)
	}
	if !strings.HasPrefix(rootRec.Header().Get("Content-Type"), "text/html") {
		t.Fatalf("expected text/html on /")
	}

	// 2. Client-side route serves HTML
	spaReq := httptest.NewRequest(http.MethodGet, "/freedom/dashboard", nil)
	spaRec := httptest.NewRecorder()
	router.ServeHTTP(spaRec, spaReq)
	if spaRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on /freedom/dashboard, got %d", spaRec.Code)
	}
	if !strings.HasPrefix(spaRec.Header().Get("Content-Type"), "text/html") {
		t.Fatalf("expected text/html on /freedom/dashboard")
	}

	// 3. Health check serves JSON
	healthReq := httptest.NewRequest(http.MethodGet, "/health", nil)
	healthRec := httptest.NewRecorder()
	router.ServeHTTP(healthRec, healthReq)
	if healthRec.Code != http.StatusOK {
		t.Fatalf("expected 200 on /health, got %d", healthRec.Code)
	}
	if !strings.HasPrefix(healthRec.Header().Get("Content-Type"), "application/json") {
		t.Fatalf("expected application/json on /health")
	}
}
