package tests

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/services"
)

func TestInvitationUniquenessAndSingleUse(t *testing.T) {
	env := newTestEnv(t, 24*time.Hour)
	ctx := context.Background()

	codes := make(map[string]struct{})
	for i := 0; i < 25; i++ {
		resp, err := env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
			Name:     fmt.Sprintf("Freedom %d", i),
			Email:    fmt.Sprintf("freedom%d@example.com", i),
			Password: "StrongPassword123!",
		})
		if err != nil {
			t.Fatalf("register freedom %d failed: %v", i, err)
		}
		if resp.Invitation == nil || resp.Invitation.Code == "" {
			t.Fatalf("expected invitation code for freedom %d", i)
		}
		if _, dup := codes[resp.Invitation.Code]; dup {
			t.Fatalf("duplicate invitation code generated: %s", resp.Invitation.Code)
		}
		codes[resp.Invitation.Code] = struct{}{}
	}

	// Register one Freedom Partner and join once, then verify reuse and third user are rejected.
	freedomResp, err := env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Primary Freedom",
		Email:    "primary@example.com",
		Password: "StrongPassword123!",
	})
	if err != nil {
		t.Fatalf("register primary freedom: %v", err)
	}

	secretResp, err := env.authService.JoinSecret(ctx, models.JoinSecretRequest{
		Name:           "Secret One",
		Email:          "secret1@example.com",
		Password:       "StrongPassword123!",
		InvitationCode: freedomResp.Invitation.Code,
	})
	if err != nil {
		t.Fatalf("join secret failed: %v", err)
	}
	if secretResp.User.PairID != freedomResp.User.PairID {
		t.Fatalf("expected matching pair_id, got freedom=%s secret=%s", freedomResp.User.PairID, secretResp.User.PairID)
	}
	if secretResp.User.Role != models.RoleSecretPartner {
		t.Fatalf("expected role %s, got %s", models.RoleSecretPartner, secretResp.User.Role)
	}

	// Second join with same invitation code must fail.
	_, err = env.authService.JoinSecret(ctx, models.JoinSecretRequest{
		Name:           "Third User",
		Email:          "third@example.com",
		Password:       "StrongPassword123!",
		InvitationCode: freedomResp.Invitation.Code,
	})
	if err == nil {
		t.Fatal("expected error when reusing invitation code for third user")
	}
	appErr, ok := services.AsAppError(err)
	if !ok || appErr.Code != "INVITATION_USED" {
		t.Fatalf("expected INVITATION_USED error, got: %v", err)
	}
}

func TestInvitationExpiration(t *testing.T) {
	env := newTestEnv(t, 15*time.Millisecond)
	ctx := context.Background()

	freedomResp, err := env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Expiring Freedom",
		Email:    "expiring@example.com",
		Password: "StrongPassword123!",
	})
	if err != nil {
		t.Fatalf("register freedom: %v", err)
	}

	time.Sleep(30 * time.Millisecond)

	_, err = env.authService.JoinSecret(ctx, models.JoinSecretRequest{
		Name:           "Late Secret",
		Email:          "late@example.com",
		Password:       "StrongPassword123!",
		InvitationCode: freedomResp.Invitation.Code,
	})
	if err == nil {
		t.Fatal("expected expired invitation error")
	}
	appErr, ok := services.AsAppError(err)
	if !ok || appErr.Code != "INVITATION_EXPIRED" {
		t.Fatalf("expected INVITATION_EXPIRED, got: %v", err)
	}
}

func TestConcurrentJoinRaceOnlyOneSucceeds(t *testing.T) {
	env := newTestEnv(t, 24*time.Hour)
	ctx := context.Background()

	freedomResp, err := env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Race Freedom",
		Email:    "racefreedom@example.com",
		Password: "StrongPassword123!",
	})
	if err != nil {
		t.Fatalf("register freedom: %v", err)
	}

	const competitors = 16
	var wg sync.WaitGroup
	var successCount atomic.Int32
	var failCount atomic.Int32

	start := make(chan struct{})
	for i := 0; i < competitors; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-start
			_, joinErr := env.authService.JoinSecret(ctx, models.JoinSecretRequest{
				Name:           fmt.Sprintf("Secret %d", idx),
				Email:          fmt.Sprintf("racesecret%d@example.com", idx),
				Password:       "StrongPassword123!",
				InvitationCode: freedomResp.Invitation.Code,
			})
			if joinErr == nil {
				successCount.Add(1)
			} else {
				failCount.Add(1)
			}
		}(i)
	}

	close(start)
	wg.Wait()

	if successCount.Load() != 1 {
		t.Fatalf("expected exactly 1 successful join under concurrency, got %d", successCount.Load())
	}
	if failCount.Load() != competitors-1 {
		t.Fatalf("expected %d failed joins, got %d", competitors-1, failCount.Load())
	}
}
