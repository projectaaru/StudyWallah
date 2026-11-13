package main

import (
	"context"
	"crypto/tls"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/config"
	"github.com/projectaaru/studywallah-backend/internal/database"
	"github.com/projectaaru/studywallah-backend/internal/repository"
	"github.com/projectaaru/studywallah-backend/internal/routes"
	"github.com/projectaaru/studywallah-backend/internal/services"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"github.com/projectaaru/studywallah-backend/migrations"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("configuration error", "error", err)
		os.Exit(1)
	}

	startupCtx, startupCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer startupCancel()

	client, db, err := database.Connect(startupCtx, cfg.MongoURI, cfg.MongoDBName)
	if err != nil {
		logger.Error("failed connecting to MongoDB", "error", err)
		os.Exit(1)
	}
	defer func() {
		disconnectCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = client.Disconnect(disconnectCtx)
	}()

	if err := migrations.EnsureIndexes(startupCtx, db); err != nil {
		logger.Error("failed ensuring MongoDB indexes", "error", err)
		os.Exit(1)
	}

	repo := repository.NewMongoRepository(client, db)
	jwtMgr := utils.NewJWTManager(cfg.JWTSecret, cfg.JWTExpiry)

	authService := services.NewAuthService(repo, jwtMgr, cfg.InvitationExpiry)
	freedomService := services.NewFreedomService(repo, cfg.Location, cfg.Timezone)
	secretService := services.NewSecretService(repo)

	router := routes.NewRouter(routes.Dependencies{
		Repo:           repo,
		JWTManager:     jwtMgr,
		AuthService:    authService,
		FreedomService: freedomService,
		SecretService:  secretService,
		Logger:         logger,
		RequestTimeout: cfg.RequestTimeout,
		CORSOrigins:    cfg.CORSAllowedOrigins,
	})

	srv := &http.Server{
		Addr:              cfg.Address(),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		// Enforce HTTP/1.1 semantics.
		TLSNextProto: make(map[string]func(*http.Server, *tls.Conn, http.Handler)),
	}

	ln, err := net.Listen("tcp", cfg.Address())
	if err != nil {
		logger.Error("failed binding TCP listener", "address", cfg.Address(), "error", err)
		os.Exit(1)
	}

	serverErr := make(chan error, 1)
	go func() {
		logger.Info("studywallah api listening", "address", cfg.Address(), "timezone", cfg.Timezone)
		if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
		close(serverErr)
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		if err != nil {
			logger.Error("server exited unexpectedly", "error", err)
			os.Exit(1)
		}
	case sig := <-stop:
		logger.Info("shutting down server", "signal", sig.String())
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Error("graceful shutdown failed", "error", err)
			os.Exit(1)
		}
		logger.Info("server shutdown complete")
	}
}
