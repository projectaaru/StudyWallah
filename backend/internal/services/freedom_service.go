package services

import (
	"context"
	"errors"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/repository"
	"github.com/projectaaru/studywallah-backend/internal/utils"
)

// FreedomService provides dashboard, signal reading, invitation viewing, and acknowledgement logic.
type FreedomService struct {
	repo     repository.Repository
	location *time.Location
	timezone string
}

// NewFreedomService constructs a FreedomService with the configured timezone.
func NewFreedomService(repo repository.Repository, loc *time.Location, timezone string) *FreedomService {
	if loc == nil {
		loc = time.UTC
		timezone = "UTC"
	}
	return &FreedomService{
		repo:     repo,
		location: loc,
		timezone: timezone,
	}
}

// GetInvitation returns the Freedom Partner's generated invitation code and pairing state.
func (s *FreedomService) GetInvitation(ctx context.Context, user *models.User) (*models.InvitationDTO, error) {
	inv, pair, err := s.repo.GetInvitationByFreedomPartnerID(ctx, user.ID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, NewNotFound("INVITATION_NOT_FOUND", "Invitation not found")
		}
		return nil, NewInternal(err)
	}

	return &models.InvitationDTO{
		Code:       inv.Code,
		ExpiresAt:  inv.ExpiresAt,
		Used:       inv.Used,
		UsedAt:     inv.UsedAt,
		PairStatus: pair.Status,
	}, nil
}

// GetDashboard returns today's signal count, unread count, last update timestamp, and recent signals.
// Opening the dashboard never auto-acknowledges pending signals.
func (s *FreedomService) GetDashboard(ctx context.Context, user *models.User) (*models.FreedomDashboardResponse, error) {
	if user.PairID == nil {
		return nil, NewBadRequest("PAIR_NOT_FOUND", "User is not associated with a pair")
	}

	pair, err := s.repo.GetPairByID(ctx, *user.PairID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, NewNotFound("PAIR_NOT_FOUND", "Pair not found")
		}
		return nil, NewInternal(err)
	}

	startUTC, endUTC := utils.DayBoundsInLocation(time.Now(), s.location)
	stats, err := s.repo.GetFreedomDashboard(ctx, *user.PairID, startUTC, endUTC, 20)
	if err != nil {
		return nil, NewInternal(err)
	}

	status := models.SignalStatusGreen
	if stats.UnreadCount > 0 {
		status = models.SignalStatusRed
	}

	return &models.FreedomDashboardResponse{
		TodayTotal:    stats.TodayTotal,
		UnreadCount:   stats.UnreadCount,
		TotalCount:    stats.TotalCount,
		LastUpdateAt:  stats.LastUpdateAt,
		Status:        status,
		PairStatus:    pair.Status,
		Timezone:      s.timezone,
		RecentSignals: toSignalDTOs(stats.RecentSignals),
	}, nil
}

// ListSignals returns paginated signal history for the Freedom Partner without modifying acknowledgement state.
func (s *FreedomService) ListSignals(ctx context.Context, user *models.User, page, limit int64) (*models.FreedomSignalsPageResponse, error) {
	if user.PairID == nil {
		return nil, NewBadRequest("PAIR_NOT_FOUND", "User is not associated with a pair")
	}

	page, limit = utils.ParsePagination(page, limit)
	signals, total, err := s.repo.ListSignalsPaginated(ctx, *user.PairID, page, limit)
	if err != nil {
		return nil, NewInternal(err)
	}

	totalPages := int64(0)
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}

	return &models.FreedomSignalsPageResponse{
		Signals:    toSignalDTOs(signals),
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

// ViewedAll atomically and idempotently acknowledges all signals existing at execution time.
// Any signal created concurrently after cutoff remains unacknowledged.
func (s *FreedomService) ViewedAll(ctx context.Context, user *models.User) (*models.ViewedAllResponse, error) {
	if user.PairID == nil {
		return nil, NewBadRequest("PAIR_NOT_FOUND", "User is not associated with a pair")
	}

	cutoff := time.Now().UTC()
	acknowledgedCount, remainingUnread, err := s.repo.AcknowledgeAllPendingSignals(ctx, *user.PairID, user.ID, cutoff)
	if err != nil {
		return nil, NewInternal(err)
	}

	status := models.SignalStatusGreen
	if remainingUnread > 0 {
		status = models.SignalStatusRed
	}

	return &models.ViewedAllResponse{
		AcknowledgedCount: acknowledgedCount,
		UnreadCount:       remainingUnread,
		Status:            status,
		AcknowledgedAt:    cutoff,
	}, nil
}

func toSignalDTOs(signals []models.Signal) []models.SignalItemDTO {
	out := make([]models.SignalItemDTO, 0, len(signals))
	for _, sig := range signals {
		out = append(out, models.SignalItemDTO{
			ID:             sig.ID.Hex(),
			Content:        sig.Content,
			CreatedAt:      sig.CreatedAt,
			Acknowledged:   sig.Acknowledged,
			AcknowledgedAt: sig.AcknowledgedAt,
		})
	}
	return out
}
