package routes

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/handlers"
	"github.com/projectaaru/studywallah-backend/internal/middleware"
	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/repository"
	"github.com/projectaaru/studywallah-backend/internal/services"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"github.com/projectaaru/studywallah-backend/internal/web"
)

// Dependencies groups everything required to build the HTTP router.
type Dependencies struct {
	Repo           repository.Repository
	JWTManager     *utils.JWTManager
	AuthService    *services.AuthService
	FreedomService *services.FreedomService
	SecretService  *services.SecretService
	Logger         *slog.Logger
	RequestTimeout time.Duration
	CORSOrigins    []string
}

// NewRouter constructs the HTTP handler with all routes and middleware attached.
func NewRouter(deps Dependencies) http.Handler {
	mux := http.NewServeMux()

	healthH := handlers.NewHealthHandler(deps.Repo)
	newsH := handlers.NewNewsHandler()
	authH := handlers.NewAuthHandler(deps.AuthService, deps.Logger)
	freedomH := handlers.NewFreedomHandler(deps.FreedomService, deps.Logger)
	secretH := handlers.NewSecretHandler(deps.SecretService, deps.Logger)

	authMW := middleware.Authenticate(deps.JWTManager, deps.Repo, deps.Logger)
	freedomOnly := middleware.RequireRole(models.RoleFreedomPartner)
	secretOnly := middleware.RequireRole(models.RoleSecretPartner)

	withAuth := func(h http.HandlerFunc) http.Handler {
		return authMW(h)
	}
	withFreedom := func(h http.HandlerFunc) http.Handler {
		return authMW(freedomOnly(h))
	}
	withSecret := func(h http.HandlerFunc) http.Handler {
		return authMW(secretOnly(h))
	}

	// System probes & public educational updates
	mux.HandleFunc("GET /health", healthH.Health)
	mux.HandleFunc("GET /ready", healthH.Ready)
	mux.HandleFunc("GET /api/v1/public/neet-updates", newsH.GetNeetUpdates)

	// Authentication
	mux.HandleFunc("POST /api/v1/auth/register-freedom", authH.RegisterFreedom)
	mux.HandleFunc("POST /api/v1/auth/join-secret", authH.JoinSecret)
	mux.HandleFunc("POST /api/v1/auth/login", authH.Login)
	mux.Handle("GET /api/v1/auth/me", withAuth(authH.Me))

	// Freedom Partner (strictly 403 for Secret Partner)
	mux.Handle("GET /api/v1/freedom/invitation", withFreedom(freedomH.GetInvitation))
	mux.Handle("GET /api/v1/freedom/dashboard", withFreedom(freedomH.GetDashboard))
	mux.Handle("GET /api/v1/freedom/signals", withFreedom(freedomH.ListSignals))
	mux.Handle("POST /api/v1/freedom/signals/viewed-all", withFreedom(freedomH.ViewedAll))

	// Secret Partner (strictly 403 for Freedom Partner)
	mux.Handle("POST /api/v1/secret/signals", withSecret(secretH.CreateSignal))
	mux.Handle("GET /api/v1/secret/signals/status", withSecret(secretH.GetStatus))

	// Catch-all for unknown /api/ requests: strictly returns 404 JSON (never falls through to index.html)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		handlers.WriteJSON(w, http.StatusNotFound, models.ErrorResponse{
			Error: models.ErrorDetail{
				Code:    "NOT_FOUND",
				Message: "API endpoint not found",
			},
		})
	})

	// Web frontend: serves embedded SPA static assets with client-side fallback
	mux.Handle("/", web.Handler())

	var handler http.Handler = mux
	handler = middleware.Timeout(deps.RequestTimeout)(handler)
	handler = middleware.CORS(deps.CORSOrigins)(handler)
	handler = middleware.Logging(deps.Logger)(handler)
	handler = middleware.Recovery(deps.Logger)(handler)
	return handler
}
