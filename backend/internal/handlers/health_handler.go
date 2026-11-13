package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/repository"
)

// HealthHandler serves liveness and readiness probes.
type HealthHandler struct {
	repo repository.Repository
}

// NewHealthHandler constructs a HealthHandler.
func NewHealthHandler(repo repository.Repository) *HealthHandler {
	return &HealthHandler{repo: repo}
}

// Health handles GET /health.
func (h *HealthHandler) Health(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"service":   "studywallah-api",
		"timestamp": time.Now().UTC(),
	})
}

// Ready handles GET /ready by verifying MongoDB connectivity.
func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	if err := h.repo.Ping(ctx); err != nil {
		WriteJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status":   "not_ready",
			"database": "disconnected",
		})
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"status":   "ready",
		"database": "connected",
	})
}
