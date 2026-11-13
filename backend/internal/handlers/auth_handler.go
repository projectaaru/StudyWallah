package handlers

import (
	"log/slog"
	"net/http"

	"github.com/projectaaru/studywallah-backend/internal/middleware"
	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/services"
)

// AuthHandler handles authentication and pairing endpoints.
type AuthHandler struct {
	authService *services.AuthService
	logger      *slog.Logger
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(authService *services.AuthService, logger *slog.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logger:      logger,
	}
}

// RegisterFreedom handles POST /api/v1/auth/register-freedom.
func (h *AuthHandler) RegisterFreedom(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterFreedomRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, h.logger, err)
		return
	}

	resp, err := h.authService.RegisterFreedom(r.Context(), req)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// JoinSecret handles POST /api/v1/auth/join-secret.
func (h *AuthHandler) JoinSecret(w http.ResponseWriter, r *http.Request) {
	var req models.JoinSecretRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, h.logger, err)
		return
	}

	resp, err := h.authService.JoinSecret(r.Context(), req)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}

	WriteJSON(w, http.StatusCreated, resp)
}

// Login handles POST /api/v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, h.logger, err)
		return
	}

	resp, err := h.authService.Login(r.Context(), req)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}

// Me handles GET /api/v1/auth/me.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	resp, err := h.authService.GetMe(r.Context(), user)
	if err != nil {
		WriteError(w, h.logger, err)
		return
	}

	WriteJSON(w, http.StatusOK, resp)
}
