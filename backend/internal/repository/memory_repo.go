package repository

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MemoryRepository provides a concurrency-safe in-memory Repository implementation for deterministic testing.
type MemoryRepository struct {
	mu          sync.RWMutex
	usersByID   map[primitive.ObjectID]models.User
	usersByMail map[string]primitive.ObjectID
	pairsByID   map[primitive.ObjectID]models.Pair
	invByCode   map[string]models.Invitation
	invByUser   map[primitive.ObjectID]string
	signals     []models.Signal
}

// NewMemoryRepository constructs an empty MemoryRepository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		usersByID:   make(map[primitive.ObjectID]models.User),
		usersByMail: make(map[string]primitive.ObjectID),
		pairsByID:   make(map[primitive.ObjectID]models.Pair),
		invByCode:   make(map[string]models.Invitation),
		invByUser:   make(map[primitive.ObjectID]string),
		signals:     make([]models.Signal, 0),
	}
}

func (m *MemoryRepository) Ping(_ context.Context) error {
	return nil
}

func (m *MemoryRepository) CreateFreedomPartnerWithPairAndInvitation(
	_ context.Context,
	user *models.User,
	pair *models.Pair,
	invitation *models.Invitation,
) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.usersByMail[user.Email]; exists {
		return ErrDuplicateEmail
	}
	if _, exists := m.invByCode[invitation.Code]; exists {
		return ErrDuplicateInvitationCode
	}

	if user.ID.IsZero() {
		user.ID = primitive.NewObjectID()
	}
	if pair.ID.IsZero() {
		pair.ID = primitive.NewObjectID()
	}
	if invitation.ID.IsZero() {
		invitation.ID = primitive.NewObjectID()
	}

	pairID := pair.ID
	user.PairID = &pairID
	pair.FreedomPartnerID = user.ID
	invitation.PairID = pair.ID
	invitation.FreedomPartnerID = user.ID

	m.usersByID[user.ID] = *user
	m.usersByMail[user.Email] = user.ID
	m.pairsByID[pair.ID] = *pair
	m.invByCode[invitation.Code] = *invitation
	m.invByUser[user.ID] = invitation.Code
	return nil
}

func (m *MemoryRepository) JoinSecretPartnerWithInvitation(
	_ context.Context,
	code string,
	secretUser *models.User,
) (*models.Pair, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now().UTC()

	if _, exists := m.usersByMail[secretUser.Email]; exists {
		return nil, ErrDuplicateEmail
	}

	inv, exists := m.invByCode[code]
	if !exists {
		return nil, ErrInvalidInvitation
	}
	if inv.Used {
		return nil, ErrInvitationUsed
	}
	if !inv.ExpiresAt.After(now) {
		return nil, ErrInvitationExpired
	}

	pair, pairExists := m.pairsByID[inv.PairID]
	if !pairExists {
		return nil, ErrNotFound
	}
	if pair.SecretPartnerID != nil || pair.Status != models.PairStatusPending {
		return nil, ErrPairAlreadyActive
	}

	if secretUser.ID.IsZero() {
		secretUser.ID = primitive.NewObjectID()
	}

	pairID := pair.ID
	secretUser.PairID = &pairID
	secretID := secretUser.ID

	inv.Used = true
	inv.UsedAt = &now
	inv.UsedBy = &secretID
	m.invByCode[code] = inv

	pair.SecretPartnerID = &secretID
	pair.Status = models.PairStatusActive
	pair.PairedAt = &now
	m.pairsByID[pair.ID] = pair

	m.usersByID[secretUser.ID] = *secretUser
	m.usersByMail[secretUser.Email] = secretUser.ID

	pairCopy := pair
	return &pairCopy, nil
}

func (m *MemoryRepository) GetUserByEmail(_ context.Context, email string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	id, ok := m.usersByMail[email]
	if !ok {
		return nil, ErrNotFound
	}
	u := m.usersByID[id]
	return &u, nil
}

func (m *MemoryRepository) GetUserByID(_ context.Context, id primitive.ObjectID) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	u, ok := m.usersByID[id]
	if !ok {
		return nil, ErrNotFound
	}
	return &u, nil
}

func (m *MemoryRepository) GetPairByID(_ context.Context, id primitive.ObjectID) (*models.Pair, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	p, ok := m.pairsByID[id]
	if !ok {
		return nil, ErrNotFound
	}
	return &p, nil
}

func (m *MemoryRepository) GetInvitationByFreedomPartnerID(
	_ context.Context,
	freedomPartnerID primitive.ObjectID,
) (*models.Invitation, *models.Pair, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	code, ok := m.invByUser[freedomPartnerID]
	if !ok {
		return nil, nil, ErrNotFound
	}
	inv := m.invByCode[code]
	pair, ok := m.pairsByID[inv.PairID]
	if !ok {
		return nil, nil, ErrNotFound
	}
	return &inv, &pair, nil
}

func (m *MemoryRepository) CreateSignal(_ context.Context, signal *models.Signal) (*models.Signal, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if signal.ID.IsZero() {
		signal.ID = primitive.NewObjectID()
	}
	if signal.CreatedAt.IsZero() {
		signal.CreatedAt = time.Now().UTC()
	}
	signal.Acknowledged = false
	signal.AcknowledgedAt = nil
	signal.AcknowledgedBy = nil

	m.signals = append(m.signals, *signal)
	copySig := *signal
	return &copySig, nil
}

func (m *MemoryRepository) GetFreedomDashboard(
	_ context.Context,
	pairID primitive.ObjectID,
	startOfDayUTC, endOfDayUTC time.Time,
	recentLimit int64,
) (*DashboardStats, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if recentLimit <= 0 {
		recentLimit = 20
	}

	var pairSignals []models.Signal
	var todayTotal, unreadCount, totalCount int64

	for _, s := range m.signals {
		if s.PairID != pairID {
			continue
		}
		totalCount++
		if !s.Acknowledged {
			unreadCount++
		}
		if !s.CreatedAt.Before(startOfDayUTC) && s.CreatedAt.Before(endOfDayUTC) {
			todayTotal++
		}
		pairSignals = append(pairSignals, s)
	}

	sortSignalsDesc(pairSignals)

	var lastUpdateAt *time.Time
	if len(pairSignals) > 0 {
		t := pairSignals[0].CreatedAt.UTC()
		lastUpdateAt = &t
	}

	if int64(len(pairSignals)) > recentLimit {
		pairSignals = pairSignals[:recentLimit]
	}

	return &DashboardStats{
		TodayTotal:    todayTotal,
		UnreadCount:   unreadCount,
		TotalCount:    totalCount,
		LastUpdateAt:  lastUpdateAt,
		RecentSignals: pairSignals,
	}, nil
}

func (m *MemoryRepository) ListSignalsPaginated(
	_ context.Context,
	pairID primitive.ObjectID,
	page, limit int64,
) ([]models.Signal, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var pairSignals []models.Signal
	for _, s := range m.signals {
		if s.PairID == pairID {
			pairSignals = append(pairSignals, s)
		}
	}

	sortSignalsDesc(pairSignals)
	total := int64(len(pairSignals))

	start := (page - 1) * limit
	if start >= total {
		return []models.Signal{}, total, nil
	}
	end := start + limit
	if end > total {
		end = total
	}
	return pairSignals[start:end], total, nil
}

func (m *MemoryRepository) AcknowledgeAllPendingSignals(
	_ context.Context,
	pairID, freedomUserID primitive.ObjectID,
	cutoffTime time.Time,
) (int64, int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	cutoff := cutoffTime.UTC()
	var acknowledgedCount int64
	var remainingUnread int64

	for i := range m.signals {
		if m.signals[i].PairID != pairID {
			continue
		}
		if !m.signals[i].Acknowledged && !m.signals[i].CreatedAt.After(cutoff) {
			m.signals[i].Acknowledged = true
			ackTime := cutoff
			ackBy := freedomUserID
			m.signals[i].AcknowledgedAt = &ackTime
			m.signals[i].AcknowledgedBy = &ackBy
			acknowledgedCount++
		} else if !m.signals[i].Acknowledged {
			remainingUnread++
		}
	}
	return acknowledgedCount, remainingUnread, nil
}

func (m *MemoryRepository) GetSecretSignalStatus(_ context.Context, pairID primitive.ObjectID) (*SecretStatusStats, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var pendingCount, totalSent int64
	for _, s := range m.signals {
		if s.PairID != pairID {
			continue
		}
		totalSent++
		if !s.Acknowledged {
			pendingCount++
		}
	}
	return &SecretStatusStats{
		PendingCount: pendingCount,
		TotalSent:    totalSent,
	}, nil
}

func sortSignalsDesc(items []models.Signal) {
	sort.Slice(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].ID.Hex() > items[j].ID.Hex()
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
}
