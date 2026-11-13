package tests

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/config"
	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/services"
	"github.com/projectaaru/studywallah-backend/internal/utils"
)

func TestAuthValidationAndWrongCredentials(t *testing.T) {
	env := newTestEnv(t, 24*time.Hour)
	ctx := context.Background()

	// Invalid email
	if _, err := env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Aaru",
		Email:    "not-an-email",
		Password: "StrongPassword123!",
	}); err == nil {
		t.Fatal("expected error for invalid email")
	}

	// Short password
	if _, err := env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Aaru",
		Email:    "valid@example.com",
		Password: "short",
	}); err == nil {
		t.Fatal("expected error for short password")
	}

	// Register valid Freedom Partner
	_, err := env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Aaru",
		Email:    "valid@example.com",
		Password: "StrongPassword123!",
	})
	if err != nil {
		t.Fatalf("register freedom: %v", err)
	}

	// Duplicate email rejected
	_, err = env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Aaru Two",
		Email:    "VALID@example.com",
		Password: "StrongPassword123!",
	})
	if appErr, ok := services.AsAppError(err); !ok || appErr.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 conflict on duplicate email, got %v", err)
	}

	// Wrong password rejected with 401
	_, err = env.authService.Login(ctx, models.LoginRequest{
		Email:    "valid@example.com",
		Password: "WrongPassword123!",
	})
	if appErr, ok := services.AsAppError(err); !ok || appErr.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 unauthorized on wrong password, got %v", err)
	}
}

func TestJWTTamperingRejected(t *testing.T) {
	env := newTestEnv(t, 24*time.Hour)

	fResp, err := env.authService.RegisterFreedom(context.Background(), models.RegisterFreedomRequest{
		Name:     "JWT Freedom",
		Email:    "jwt.freedom@example.com",
		Password: "StrongPassword123!",
	})
	if err != nil {
		t.Fatalf("register freedom: %v", err)
	}

	// Forged token signed with wrong secret must be rejected with 401.
	badJWT := utils.NewJWTManager("wrong-secret-key-at-least-32-characters", time.Hour)
	forgedToken, _, err := badJWT.Generate(fResp.User.ID, models.RoleFreedomPartner)
	if err != nil {
		t.Fatalf("generate forged token: %v", err)
	}

	rec := doRequest(t, env.router, http.MethodGet, "/api/v1/auth/me", forgedToken, nil)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for forged token, got %d", rec.Code)
	}

	// Token claiming escalated/different role must also be rejected when verified against DB.
	tamperedRoleToken, _, err := env.jwtMgr.Generate(fResp.User.ID, models.RoleSecretPartner)
	if err != nil {
		t.Fatalf("generate role-mismatched token: %v", err)
	}
	rec2 := doRequest(t, env.router, http.MethodGet, "/api/v1/secret/signals/status", tamperedRoleToken, nil)
	if rec2.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for role-mismatched token, got %d", rec2.Code)
	}
}

func TestConfigLoadValidation(t *testing.T) {
	t.Setenv("MONGO_URI", "mongodb://127.0.0.1:27017")
	t.Setenv("JWT_SECRET", "short")
	if _, err := config.Load(); err == nil {
		t.Fatal("expected error when JWT_SECRET is shorter than 32 characters")
	}

	t.Setenv("JWT_SECRET", "0123456789abcdef0123456789abcdef")
	t.Setenv("TIMEZONE", "Asia/Kolkata")
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("expected valid config, got: %v", err)
	}
	if cfg.Timezone != "Asia/Kolkata" {
		t.Fatalf("expected Asia/Kolkata timezone, got %s", cfg.Timezone)
	}
}
