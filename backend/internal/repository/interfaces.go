package repository

import (
	"context"
	"errors"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrNotFound                = errors.New("resource not found")
	ErrDuplicateEmail          = errors.New("email is already registered")
	ErrDuplicateInvitationCode = errors.New("invitation code collision")
	ErrInvalidInvitation       = errors.New("invalid invitation code")
	ErrInvitationUsed          = errors.New("invitation code has already been used")
	ErrInvitationExpired       = errors.New("invitation code has expired")
	ErrPairAlreadyActive       = errors.New("pair already has a secret partner")
)

// DashboardStats holds aggregated counts and recent signals for the Freedom Partner dashboard.
type DashboardStats struct {
	TodayTotal    int64
	UnreadCount   int64
	TotalCount    int64
	LastUpdateAt  *time.Time
	RecentSignals []models.Signal
}

// SecretStatusStats holds strictly aggregate acknowledgement status for the Secret Partner.
type SecretStatusStats struct {
	PendingCount int64
	TotalSent    int64
}

// Repository defines persistence operations required by StudyWallah services.
type Repository interface {
	Ping(ctx context.Context) error

	CreateFreedomPartnerWithPairAndInvitation(
		ctx context.Context,
		user *models.User,
		pair *models.Pair,
		invitation *models.Invitation,
	) error

	JoinSecretPartnerWithInvitation(
		ctx context.Context,
		code string,
		secretUser *models.User,
	) (*models.Pair, error)

	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	GetPairByID(ctx context.Context, id primitive.ObjectID) (*models.Pair, error)
	GetInvitationByFreedomPartnerID(ctx context.Context, freedomPartnerID primitive.ObjectID) (*models.Invitation, *models.Pair, error)

	CreateSignal(ctx context.Context, signal *models.Signal) (*models.Signal, error)
	GetFreedomDashboard(ctx context.Context, pairID primitive.ObjectID, startOfDayUTC, endOfDayUTC time.Time, recentLimit int64) (*DashboardStats, error)
	ListSignalsPaginated(ctx context.Context, pairID primitive.ObjectID, page, limit int64) ([]models.Signal, int64, error)
	AcknowledgeAllPendingSignals(ctx context.Context, pairID, freedomUserID primitive.ObjectID, cutoffTime time.Time) (acknowledgedCount int64, remainingUnread int64, err error)
	GetSecretSignalStatus(ctx context.Context, pairID primitive.ObjectID) (*SecretStatusStats, error)
}
