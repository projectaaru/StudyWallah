package tests

import (
	"io"
	"log/slog"
	"net/http"
	"testing"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/repository"
	"github.com/projectaaru/studywallah-backend/internal/routes"
	"github.com/projectaaru/studywallah-backend/internal/services"
	"github.com/projectaaru/studywallah-backend/internal/utils"
)

type testEnv struct {
	repo           *repository.MemoryRepository
	jwtMgr         *utils.JWTManager
	authService    *services.AuthService
	freedomService *services.FreedomService
	secretService  *services.SecretService
	router         http.Handler
}

func newTestEnv(t *testing.T, invExpiry time.Duration) *testEnv {
	t.Helper()
	if invExpiry <= 0 {
		invExpiry = 24 * time.Hour
	}

	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		t.Fatalf("load Asia/Kolkata location: %v", err)
	}

	repo := repository.NewMemoryRepository()
	jwtMgr := utils.NewJWTManager("test-secret-key-at-least-32-characters-long", 24*time.Hour)
	authSvc := services.NewAuthService(repo, jwtMgr, invExpiry)
	freedomSvc := services.NewFreedomService(repo, loc, "Asia/Kolkata")
	secretSvc := services.NewSecretService(repo)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	router := routes.NewRouter(routes.Dependencies{
		Repo:           repo,
		JWTManager:     jwtMgr,
		AuthService:    authSvc,
		FreedomService: freedomSvc,
		SecretService:  secretSvc,
		Logger:         logger,
		RequestTimeout: 5 * time.Second,
		CORSOrigins:    []string{"*"},
	})

	return &testEnv{
		repo:           repo,
		jwtMgr:         jwtMgr,
		authService:    authSvc,
		freedomService: freedomSvc,
		secretService:  secretSvc,
		router:         router,
	}
}
