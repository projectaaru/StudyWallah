package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/services"
)

const maxRequestBodyBytes = 1 << 20 // 1 MiB

// WriteJSON writes a JSON payload with the given HTTP status code.
func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if payload != nil {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

// WriteError maps service/domain errors into standardized JSON error responses.
func WriteError(w http.ResponseWriter, logger *slog.Logger, err error) {
	if appErr, ok := services.AsAppError(err); ok {
		if appErr.StatusCode >= 500 && logger != nil {
			logger.Error("internal request error", "code", appErr.Code, "error", appErr.Err)
		}
		WriteJSON(w, appErr.StatusCode, models.ErrorResponse{
			Error: models.ErrorDetail{
				Code:    appErr.Code,
				Message: appErr.Message,
			},
		})
		return
	}

	if logger != nil {
		logger.Error("unhandled error", "error", err)
	}
	WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{
		Error: models.ErrorDetail{
			Code:    "INTERNAL_ERROR",
			Message: "An internal server error occurred",
		},
	})
}

// DecodeJSON reads and validates a single JSON object from the request body.
func DecodeJSON(r *http.Request, dst any) error {
	if r.Body == nil {
		return services.NewBadRequest("INVALID_JSON", "Request body is required")
	}
	limited := io.LimitReader(r.Body, maxRequestBodyBytes)
	dec := json.NewDecoder(limited)
	if err := dec.Decode(dst); err != nil {
		return services.NewBadRequest("INVALID_JSON", "Malformed JSON request body")
	}
	// Ensure no trailing unexpected tokens after the primary JSON object.
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return services.NewBadRequest("INVALID_JSON", "Request body must contain a single JSON object")
	}
	return nil
}
