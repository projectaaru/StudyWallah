package handlers

import (
	"log/slog"
	"net/http"

	"github.com/projectaaru/studywallah-backend/internal/middleware"
	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/services"
)

// SecretHandler handles SECRET_PARTNER-only endpoints.
type SecretHandler struct {
	secretService *services.SecretService
	logger        *slog.Logger
}

// NewSecretHandler constructs a SecretHandler.
func NewSecretHandler(secretService *services.SecretService, logger *slog.Logger) *SecretHandler {
	return &SecretHandler{
		secretService: secretService,
		logger:        logger,
	}
}

// CreateSignal handles POST /api/v1/secret/signals.
func (h *SecretHandler) CreateSignal(w http.ResponseWriter, r *http.Request) {
	var req models.CreateSignalRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, h.logger, err)
		return
	}

	user := middleware.UserFromContext(r.Context())
	resp, err := h.secretService.CreateSignal(r.Context(), user, req)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusCreated, resp)
}

// GetStatus handles GET /api/v1/secret/signals/status.
func (h *SecretHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	resp, err := h.secretService.GetStatus(r.Context(), user)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}
