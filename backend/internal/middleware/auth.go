package middleware

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/repository"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type contextKey string

const userContextKey contextKey = "authenticated_user"

// UserFromContext retrieves the authenticated user attached by Authenticate middleware.
func UserFromContext(ctx context.Context) *models.User {
	u, _ := ctx.Value(userContextKey).(*models.User)
	return u
}

// Authenticate verifies the Bearer JWT and loads the authoritative user record from the database.
func Authenticate(jwtMgr *utils.JWTManager, repo repository.Repository, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
			if authHeader == "" {
				writeMiddlewareError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authorization header is required")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
				writeMiddlewareError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Bearer token is required")
				return
			}

			claims, err := jwtMgr.Verify(strings.TrimSpace(parts[1]))
			if err != nil {
				writeMiddlewareError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Invalid or expired token")
				return
			}

			userID, err := primitive.ObjectIDFromHex(claims.UserID)
			if err != nil {
				writeMiddlewareError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Invalid token subject")
				return
			}

			user, err := repo.GetUserByID(r.Context(), userID)
			if err != nil {
				if errors.Is(err, repository.ErrNotFound) {
					writeMiddlewareError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Account no longer exists")
					return
				}
				if logger != nil {
					logger.Error("failed loading user in auth middleware", "error", err)
				}
				writeMiddlewareError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal server error occurred")
				return
			}

			// Always derive identity and role from the database; reject mismatched token claims.
			if user.Role != claims.Role {
				writeMiddlewareError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Token role mismatch")
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole enforces that the authenticated user possesses the exact required role.
func RequireRole(allowedRole string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := UserFromContext(r.Context())
			if user == nil {
				writeMiddlewareError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
				return
			}
			if user.Role != allowedRole {
				writeMiddlewareError(w, http.StatusForbidden, "FORBIDDEN", "You do not have permission to access this resource")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeMiddlewareError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(models.ErrorResponse{
		Error: models.ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}
