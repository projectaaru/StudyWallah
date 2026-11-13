package web

import (
	"embed"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
)

//go:embed all:dist
var distFS embed.FS

var distSubFS fs.FS

func init() {
	var err error
	distSubFS, err = fs.Sub(distFS, "dist")
	if err != nil {
		panic("failed to initialize embedded web filesystem: " + err.Error())
	}

	// Register explicit MIME types to prevent relying on host /etc/mime.types
	_ = mime.AddExtensionType(".js", "application/javascript; charset=utf-8")
	_ = mime.AddExtensionType(".mjs", "application/javascript; charset=utf-8")
	_ = mime.AddExtensionType(".css", "text/css; charset=utf-8")
	_ = mime.AddExtensionType(".html", "text/html; charset=utf-8")
	_ = mime.AddExtensionType(".htm", "text/html; charset=utf-8")
	_ = mime.AddExtensionType(".json", "application/json; charset=utf-8")
	_ = mime.AddExtensionType(".map", "application/json; charset=utf-8")
	_ = mime.AddExtensionType(".svg", "image/svg+xml")
	_ = mime.AddExtensionType(".png", "image/png")
	_ = mime.AddExtensionType(".jpg", "image/jpeg")
	_ = mime.AddExtensionType(".jpeg", "image/jpeg")
	_ = mime.AddExtensionType(".gif", "image/gif")
	_ = mime.AddExtensionType(".webp", "image/webp")
	_ = mime.AddExtensionType(".ico", "image/x-icon")
	_ = mime.AddExtensionType(".woff", "font/woff")
	_ = mime.AddExtensionType(".woff2", "font/woff2")
	_ = mime.AddExtensionType(".ttf", "font/ttf")
	_ = mime.AddExtensionType(".otf", "font/otf")
	_ = mime.AddExtensionType(".eot", "application/vnd.ms-fontobject")
	_ = mime.AddExtensionType(".txt", "text/plain; charset=utf-8")
}

// Handler returns an http.Handler that serves embedded frontend assets with
// correct MIME types, caching headers, and SPA fallback for client-side routing.
func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		cleanPath := path.Clean(strings.TrimPrefix(r.URL.Path, "/"))
		if cleanPath == "." || cleanPath == "" {
			cleanPath = "index.html"
		}

		// Try to serve static file from embedded filesystem
		f, err := distSubFS.Open(cleanPath)
		if err == nil {
			defer f.Close()
			stat, statErr := f.Stat()
			if statErr == nil && !stat.IsDir() {
				serveEmbeddedFile(w, r, cleanPath, stat, f)
				return
			}
		}

		// If a static file with an extension was requested and not found, return 404
		// (never serve index.html for missing .js, .css, .png, etc.)
		baseName := path.Base(cleanPath)
		if strings.Contains(baseName, ".") && baseName != "index.html" {
			http.NotFound(w, r)
			return
		}

		// Client-side SPA routes (e.g., /freedom/login, /freedom/dashboard):
		// Fallback to index.html
		serveIndexHTML(w, r)
	})
}

func serveEmbeddedFile(w http.ResponseWriter, r *http.Request, filePath string, stat fs.FileInfo, file fs.File) {
	ext := strings.ToLower(path.Ext(filePath))
	if ct := mime.TypeByExtension(ext); ct != "" {
		w.Header().Set("Content-Type", ct)
	}

	if filePath == "index.html" {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
	} else if strings.HasPrefix(filePath, "_expo/") || strings.HasPrefix(filePath, "assets/") {
		// Production hashed chunks and assets are immutable
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		// Other static assets (e.g., favicon.ico, metadata.json)
		w.Header().Set("Cache-Control", "public, max-age=86400")
	}

	if seeker, ok := file.(io.ReadSeeker); ok {
		http.ServeContent(w, r, stat.Name(), stat.ModTime(), seeker)
		return
	}

	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = io.Copy(w, file)
	}
}

func serveIndexHTML(w http.ResponseWriter, r *http.Request) {
	indexFile, err := distSubFS.Open("index.html")
	if err != nil {
		http.Error(w, "StudyWallah frontend index.html not found", http.StatusInternalServerError)
		return
	}
	defer indexFile.Close()

	stat, statErr := indexFile.Stat()
	if statErr != nil {
		http.Error(w, "Failed reading index.html", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	if seeker, ok := indexFile.(io.ReadSeeker); ok {
		http.ServeContent(w, r, "index.html", stat.ModTime(), seeker)
		return
	}

	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = io.Copy(w, indexFile)
	}
}
