package web_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/projectaaru/studywallah-backend/internal/web"
)

func TestWebHandler_IndexHTML(t *testing.T) {
	handler := web.Handler()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on /, got %d", rec.Code)
	}

	contentType := rec.Header().Get("Content-Type")
	if !strings.HasPrefix(contentType, "text/html") {
		t.Fatalf("expected text/html Content-Type on /, got %q", contentType)
	}

	cacheControl := rec.Header().Get("Cache-Control")
	if !strings.Contains(cacheControl, "no-cache") || !strings.Contains(cacheControl, "no-store") {
		t.Fatalf("expected no-cache Cache-Control on /, got %q", cacheControl)
	}

	if !strings.Contains(rec.Body.String(), "<html") && !strings.Contains(rec.Body.String(), "<!DOCTYPE") && !strings.Contains(rec.Body.String(), "<!doctype") {
		t.Fatalf("expected html document in body, got: %s", rec.Body.String())
	}
}

func TestWebHandler_SPAFallback(t *testing.T) {
	handler := web.Handler()

	paths := []string{
		"/freedom/login",
		"/freedom/dashboard",
		"/freedom/register",
		"/join",
		"/study",
	}

	for _, p := range paths {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 on SPA route %s, got %d", p, rec.Code)
		}

		contentType := rec.Header().Get("Content-Type")
		if !strings.HasPrefix(contentType, "text/html") {
			t.Fatalf("expected text/html for %s, got %q", p, contentType)
		}

		cacheControl := rec.Header().Get("Cache-Control")
		if !strings.Contains(cacheControl, "no-cache") {
			t.Fatalf("expected no-cache for SPA route %s, got %q", p, cacheControl)
		}
	}
}

func TestWebHandler_StaticAssetNotFound(t *testing.T) {
	handler := web.Handler()

	// Missing files with extensions must return 404, NEVER index.html
	missingPaths := []string{
		"/assets/missing.js",
		"/assets/missing.png",
		"/_expo/missing.css",
	}

	for _, p := range missingPaths {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for missing static asset %s, got %d", p, rec.Code)
		}
	}
}

func TestWebHandler_MethodNotAllowed(t *testing.T) {
	handler := web.Handler()

	disallowedMethods := []string{
		http.MethodPost,
		http.MethodPut,
		http.MethodDelete,
		http.MethodPatch,
	}

	for _, m := range disallowedMethods {
		req := httptest.NewRequest(m, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405 for method %s, got %d", m, rec.Code)
		}
	}
}

func TestWebHandler_HeadRequest(t *testing.T) {
	handler := web.Handler()

	req := httptest.NewRequest(http.MethodHead, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on HEAD /, got %d", rec.Code)
	}

	if rec.Body.Len() != 0 {
		t.Fatalf("expected empty body on HEAD /, got %d bytes", rec.Body.Len())
	}
}
