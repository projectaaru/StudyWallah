package tests

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func setupPairedUsers(t *testing.T, env *testEnv) (*models.User, *models.User) {
	t.Helper()
	ctx := context.Background()

	fResp, err := env.authService.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Freedom User",
		Email:    "freedom.sig@example.com",
		Password: "StrongPassword123!",
	})
	if err != nil {
		t.Fatalf("register freedom: %v", err)
	}

	sResp, err := env.authService.JoinSecret(ctx, models.JoinSecretRequest{
		Name:           "Secret User",
		Email:          "secret.sig@example.com",
		Password:       "StrongPassword123!",
		InvitationCode: fResp.Invitation.Code,
	})
	if err != nil {
		t.Fatalf("join secret: %v", err)
	}

	fID, _ := primitive.ObjectIDFromHex(fResp.User.ID)
	sID, _ := primitive.ObjectIDFromHex(sResp.User.ID)

	fUser, err := env.repo.GetUserByID(ctx, fID)
	if err != nil {
		t.Fatalf("load freedom user: %v", err)
	}
	sUser, err := env.repo.GetUserByID(ctx, sID)
	if err != nil {
		t.Fatalf("load secret user: %v", err)
	}
	return fUser, sUser
}

func TestSignalCreationAndIdempotentAcknowledgement(t *testing.T) {
	env := newTestEnv(t, 24*time.Hour)
	ctx := context.Background()
	freedomUser, secretUser := setupPairedUsers(t, env)

	// Initial status must be GREEN with 0 pending.
	initialStatus, err := env.secretService.GetStatus(ctx, secretUser)
	if err != nil {
		t.Fatalf("get initial secret status: %v", err)
	}
	if initialStatus.Status != models.SignalStatusGreen || !initialStatus.AllAcknowledged || initialStatus.PendingCount != 0 {
		t.Fatalf("expected initial GREEN status, got %+v", initialStatus)
	}

	// Secret sends two signals.
	for i := 1; i <= 2; i++ {
		created, err := env.secretService.CreateSignal(ctx, secretUser, models.CreateSignalRequest{
			Content: fmt.Sprintf("Physics Chapter %d revision done", i),
		})
		if err != nil {
			t.Fatalf("create signal %d: %v", i, err)
		}
		if created.Status != models.SignalStatusRed || created.Signal.Acknowledged {
			t.Fatalf("expected RED unacknowledged receipt, got %+v", created)
		}
	}

	// Secret status must now be RED.
	redStatus, err := env.secretService.GetStatus(ctx, secretUser)
	if err != nil {
		t.Fatalf("get red status: %v", err)
	}
	if redStatus.Status != models.SignalStatusRed || redStatus.PendingCount != 2 || redStatus.TotalSent != 2 {
		t.Fatalf("expected RED with pending=2 total=2, got %+v", redStatus)
	}

	// Opening Freedom dashboard must NOT auto-acknowledge signals.
	dash, err := env.freedomService.GetDashboard(ctx, freedomUser)
	if err != nil {
		t.Fatalf("get dashboard: %v", err)
	}
	if dash.UnreadCount != 2 || dash.TodayTotal != 2 || dash.Status != models.SignalStatusRed {
		t.Fatalf("expected unread=2 today=2 RED after viewing dashboard, got %+v", dash)
	}

	// ViewedAll acknowledges all pending signals.
	ackResp, err := env.freedomService.ViewedAll(ctx, freedomUser)
	if err != nil {
		t.Fatalf("viewed all: %v", err)
	}
	if ackResp.AcknowledgedCount != 2 || ackResp.UnreadCount != 0 || ackResp.Status != models.SignalStatusGreen {
		t.Fatalf("expected acknowledged=2 unread=0 GREEN, got %+v", ackResp)
	}

	// Repeating ViewedAll is idempotent.
	ackAgain, err := env.freedomService.ViewedAll(ctx, freedomUser)
	if err != nil {
		t.Fatalf("repeat viewed all: %v", err)
	}
	if ackAgain.AcknowledgedCount != 0 || ackAgain.UnreadCount != 0 || ackAgain.Status != models.SignalStatusGreen {
		t.Fatalf("expected idempotent acknowledged=0 unread=0 GREEN, got %+v", ackAgain)
	}

	// Secret status must now be GREEN.
	greenStatus, err := env.secretService.GetStatus(ctx, secretUser)
	if err != nil {
		t.Fatalf("get green status: %v", err)
	}
	if greenStatus.Status != models.SignalStatusGreen || !greenStatus.AllAcknowledged || greenStatus.PendingCount != 0 {
		t.Fatalf("expected GREEN status after ViewedAll, got %+v", greenStatus)
	}
}

func TestConcurrentSignalsCreatedAfterViewedAllRemainUnread(t *testing.T) {
	env := newTestEnv(t, 24*time.Hour)
	ctx := context.Background()
	freedomUser, secretUser := setupPairedUsers(t, env)

	// Insert an initial signal before cutoff.
	_, err := env.secretService.CreateSignal(ctx, secretUser, models.CreateSignalRequest{Content: "Before ack"})
	if err != nil {
		t.Fatalf("create initial signal: %v", err)
	}

	// Run ViewedAll at cutoff, then simulate a signal created strictly after cutoff.
	cutoff := time.Now().UTC()
	time.Sleep(5 * time.Millisecond)

	laterSig := &models.Signal{
		ID:        primitive.NewObjectID(),
		PairID:    *secretUser.PairID,
		SenderID:  secretUser.ID,
		Content:   "Concurrent after cutoff",
		CreatedAt: time.Now().UTC(),
	}
	if _, err := env.repo.CreateSignal(ctx, laterSig); err != nil {
		t.Fatalf("create later signal: %v", err)
	}

	ackCount, remainingUnread, err := env.repo.AcknowledgeAllPendingSignals(ctx, *freedomUser.PairID, freedomUser.ID, cutoff)
	if err != nil {
		t.Fatalf("acknowledge with cutoff: %v", err)
	}
	if ackCount != 1 {
		t.Fatalf("expected 1 signal acknowledged at cutoff, got %d", ackCount)
	}
	if remainingUnread != 1 {
		t.Fatalf("expected 1 signal created after cutoff to remain unread, got %d", remainingUnread)
	}

	// Parallel stress test under -race detector.
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(2)
		go func(idx int) {
			defer wg.Done()
			_, _ = env.secretService.CreateSignal(ctx, secretUser, models.CreateSignalRequest{
				Content: fmt.Sprintf("Concurrent signal %d", idx),
			})
		}(i)
		go func() {
			defer wg.Done()
			_, _ = env.freedomService.ViewedAll(ctx, freedomUser)
			_, _ = env.secretService.GetStatus(ctx, secretUser)
			_, _ = env.freedomService.GetDashboard(ctx, freedomUser)
		}()
	}
	wg.Wait()
}

func TestDayBoundsAsiaKolkata(t *testing.T) {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		t.Fatalf("load Asia/Kolkata: %v", err)
	}
	// 2026-11-12 00:30:00 +05:30 is 2026-11-11 19:00:00 UTC.
	now := time.Date(2026, 11, 12, 0, 30, 0, 0, loc)
	startUTC, endUTC := utils.DayBoundsInLocation(now, loc)

	expectedStart := time.Date(2026, 11, 11, 18, 30, 0, 0, time.UTC)
	expectedEnd := time.Date(2026, 11, 12, 18, 30, 0, 0, time.UTC)
	if !startUTC.Equal(expectedStart) || !endUTC.Equal(expectedEnd) {
		t.Fatalf("unexpected day bounds: got [%v, %v), want [%v, %v)", startUTC, endUTC, expectedStart, expectedEnd)
	}
}
