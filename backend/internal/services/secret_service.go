package services

import (
	"context"
	"strings"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SecretService handles signal creation and aggregate status inspection for Secret Partner.
type SecretService struct {
	repo repository.Repository
}

// NewSecretService constructs a SecretService.
func NewSecretService(repo repository.Repository) *SecretService {
	return &SecretService{repo: repo}
}

// CreateSignal records a new signal from the Secret Partner for their paired Freedom Partner.
func (s *SecretService) CreateSignal(ctx context.Context, user *models.User, req models.CreateSignalRequest) (*models.SecretCreateSignalResponse, error) {
	if user.PairID == nil {
		return nil, NewBadRequest("PAIR_NOT_FOUND", "Secret Partner is not linked to a pair")
	}

	content := strings.TrimSpace(req.Content)
	if len(content) == 0 || len(content) > 500 {
		return nil, NewBadRequest("INVALID_SIGNAL_CONTENT", "Signal content must be between 1 and 500 characters")
	}

	now := time.Now().UTC()
	sig := &models.Signal{
		ID:           primitive.NewObjectID(),
		PairID:       *user.PairID,
		SenderID:     user.ID,
		Content:      content,
		CreatedAt:    now,
		Acknowledged: false,
	}

	created, err := s.repo.CreateSignal(ctx, sig)
	if err != nil {
		return nil, NewInternal(err)
	}

	return &models.SecretCreateSignalResponse{
		Signal: models.SecretSignalReceiptDTO{
			ID:           created.ID.Hex(),
			CreatedAt:    created.CreatedAt,
			Acknowledged: created.Acknowledged,
		},
		Status: models.SignalStatusRed,
	}, nil
}

// GetStatus calculates the server-side aggregate RED/GREEN acknowledgement status for Secret Partner.
// It strictly omits message content and Freedom Partner activity history.
func (s *SecretService) GetStatus(ctx context.Context, user *models.User) (*models.SecretStatusResponse, error) {
	if user.PairID == nil {
		return nil, NewBadRequest("PAIR_NOT_FOUND", "Secret Partner is not linked to a pair")
	}

	stats, err := s.repo.GetSecretSignalStatus(ctx, *user.PairID)
	if err != nil {
		return nil, NewInternal(err)
	}

	status := models.SignalStatusGreen
	allAcknowledged := true
	if stats.PendingCount > 0 {
		status = models.SignalStatusRed
		allAcknowledged = false
	}

	return &models.SecretStatusResponse{
		Status:          status,
		AllAcknowledged: allAcknowledged,
		PendingCount:    stats.PendingCount,
		TotalSent:       stats.TotalSent,
	}, nil
}
