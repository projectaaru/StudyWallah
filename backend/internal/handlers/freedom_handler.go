package handlers

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/projectaaru/studywallah-backend/internal/middleware"
	"github.com/projectaaru/studywallah-backend/internal/services"
)

// FreedomHandler handles FREEDOM_PARTNER-only endpoints.
type FreedomHandler struct {
	freedomService *services.FreedomService
	logger         *slog.Logger
}

// NewFreedomHandler constructs a FreedomHandler.
func NewFreedomHandler(freedomService *services.FreedomService, logger *slog.Logger) *FreedomHandler {
	return &FreedomHandler{
		freedomService: freedomService,
		logger:         logger,
	}
}

// GetInvitation handles GET /api/v1/freedom/invitation.
func (h *FreedomHandler) GetInvitation(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	resp, err := h.freedomService.GetInvitation(r.Context(), user)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// GetDashboard handles GET /api/v1/freedom/dashboard.
func (h *FreedomHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	resp, err := h.freedomService.GetDashboard(r.Context(), user)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// ListSignals handles GET /api/v1/freedom/signals?page=1&limit=20.
func (h *FreedomHandler) ListSignals(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	q := r.URL.Query()

	page := int64(1)
	if raw := q.Get("page"); raw != "" {
		parsed, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || parsed < 1 {
			WriteError(w, h.logger, services.NewBadRequest("INVALID_PAGINATION", "page must be a positive integer"))
			return
		}
		page = parsed
	}

	limit := int64(20)
	if raw := q.Get("limit"); raw != "" {
		parsed, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || parsed < 1 {
			WriteError(w, h.logger, services.NewBadRequest("INVALID_PAGINATION", "limit must be a positive integer"))
			return
		}
		limit = parsed
	}

	resp, err := h.freedomService.ListSignals(r.Context(), user, page, limit)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}

// ViewedAll handles POST /api/v1/freedom/signals/viewed-all.
func (h *FreedomHandler) ViewedAll(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	resp, err := h.freedomService.ViewedAll(r.Context(), user)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, resp)
}
