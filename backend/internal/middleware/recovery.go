package middleware

import (
	"log/slog"
	"net/http"
)

// Recovery catches panics in downstream handlers and returns a safe 500 JSON error.
func Recovery(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					if logger != nil {
						logger.Error("panic recovered", "path", r.URL.Path, "panic", rec)
					}
					writeMiddlewareError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal server error occurred")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
