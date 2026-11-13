package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// MongoRepository implements Repository backed by MongoDB.
type MongoRepository struct {
	client      *mongo.Client
	db          *mongo.Database
	users       *mongo.Collection
	pairs       *mongo.Collection
	invitations *mongo.Collection
	signals     *mongo.Collection
}

// NewMongoRepository constructs a MongoRepository for the given client and database.
func NewMongoRepository(client *mongo.Client, db *mongo.Database) *MongoRepository {
	return &MongoRepository{
		client:      client,
		db:          db,
		users:       db.Collection("users"),
		pairs:       db.Collection("pairs"),
		invitations: db.Collection("invitations"),
		signals:     db.Collection("signals"),
	}
}

// Ping verifies MongoDB primary reachability.
func (r *MongoRepository) Ping(ctx context.Context) error {
	return r.client.Ping(ctx, readpref.Primary())
}

// CreateFreedomPartnerWithPairAndInvitation creates the user, pair, and invitation.
// Uses a MongoDB transaction when running on a replica set, or compensating cleanup on standalone MongoDB.
func (r *MongoRepository) CreateFreedomPartnerWithPairAndInvitation(
	ctx context.Context,
	user *models.User,
	pair *models.Pair,
	invitation *models.Invitation,
) error {
	if user.ID.IsZero() {
		user.ID = primitive.NewObjectID()
	}
	if pair.ID.IsZero() {
		pair.ID = primitive.NewObjectID()
	}
	if invitation.ID.IsZero() {
		invitation.ID = primitive.NewObjectID()
	}

	user.PairID = &pair.ID
	pair.FreedomPartnerID = user.ID
	invitation.PairID = pair.ID
	invitation.FreedomPartnerID = user.ID

	err := r.runWithOptionalTransaction(ctx, func(sessCtx context.Context) error {
		return r.insertFreedomBundle(sessCtx, user, pair, invitation)
	})
	if err == nil {
		return nil
	}
	if isTransactionUnsupportedErr(err) {
		return r.insertFreedomBundleWithCompensation(ctx, user, pair, invitation)
	}
	return err
}

func (r *MongoRepository) insertFreedomBundle(
	ctx context.Context,
	user *models.User,
	pair *models.Pair,
	invitation *models.Invitation,
) error {
	if _, err := r.users.InsertOne(ctx, user); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return ErrDuplicateEmail
		}
		return err
	}
	if _, err := r.pairs.InsertOne(ctx, pair); err != nil {
		return err
	}
	if _, err := r.invitations.InsertOne(ctx, invitation); err != nil {
		if mongo.IsDuplicateKeyError(err) && strings.Contains(err.Error(), "code") {
			return ErrDuplicateInvitationCode
		}
		return err
	}
	return nil
}

func (r *MongoRepository) insertFreedomBundleWithCompensation(
	ctx context.Context,
	user *models.User,
	pair *models.Pair,
	invitation *models.Invitation,
) error {
	if _, err := r.users.InsertOne(ctx, user); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return ErrDuplicateEmail
		}
		return err
	}
	if _, err := r.pairs.InsertOne(ctx, pair); err != nil {
		_, _ = r.users.DeleteOne(context.Background(), bson.M{"_id": user.ID})
		return err
	}
	if _, err := r.invitations.InsertOne(ctx, invitation); err != nil {
		_, _ = r.pairs.DeleteOne(context.Background(), bson.M{"_id": pair.ID})
		_, _ = r.users.DeleteOne(context.Background(), bson.M{"_id": user.ID})
		if mongo.IsDuplicateKeyError(err) && strings.Contains(err.Error(), "code") {
			return ErrDuplicateInvitationCode
		}
		return err
	}
	return nil
}

// JoinSecretPartnerWithInvitation atomically claims an invitation, registers the secret partner,
// and binds them exclusively to the pair.
func (r *MongoRepository) JoinSecretPartnerWithInvitation(
	ctx context.Context,
	code string,
	secretUser *models.User,
) (*models.Pair, error) {
	if secretUser.ID.IsZero() {
		secretUser.ID = primitive.NewObjectID()
	}

	var updatedPair *models.Pair
	err := r.runWithOptionalTransaction(ctx, func(sessCtx context.Context) error {
		p, txErr := r.joinSecretInSession(sessCtx, code, secretUser)
		if txErr != nil {
			return txErr
		}
		updatedPair = p
		return nil
	})
	if err == nil {
		return updatedPair, nil
	}
	if isTransactionUnsupportedErr(err) {
		return r.joinSecretStandaloneAtomic(ctx, code, secretUser)
	}
	return nil, err
}

func (r *MongoRepository) joinSecretInSession(
	ctx context.Context,
	code string,
	secretUser *models.User,
) (*models.Pair, error) {
	now := time.Now().UTC()

	// Pre-check email so we do not needlessly lock/mutate invitation when email already exists.
	count, err := r.users.CountDocuments(ctx, bson.M{"email": secretUser.Email})
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, ErrDuplicateEmail
	}

	inv, err := r.claimInvitationAtomic(ctx, code, secretUser.ID, now)
	if err != nil {
		return nil, err
	}

	secretUser.PairID = &inv.PairID
	if _, err := r.users.InsertOne(ctx, secretUser); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, ErrDuplicateEmail
		}
		return nil, err
	}

	pair, err := r.bindSecretToPairAtomic(ctx, inv.PairID, secretUser.ID, now)
	if err != nil {
		return nil, err
	}
	return pair, nil
}

func (r *MongoRepository) joinSecretStandaloneAtomic(
	ctx context.Context,
	code string,
	secretUser *models.User,
) (*models.Pair, error) {
	now := time.Now().UTC()

	count, err := r.users.CountDocuments(ctx, bson.M{"email": secretUser.Email})
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, ErrDuplicateEmail
	}

	inv, err := r.claimInvitationAtomic(ctx, code, secretUser.ID, now)
	if err != nil {
		return nil, err
	}

	secretUser.PairID = &inv.PairID
	if _, err := r.users.InsertOne(ctx, secretUser); err != nil {
		r.rollbackInvitationClaim(inv.ID, secretUser.ID)
		if mongo.IsDuplicateKeyError(err) {
			return nil, ErrDuplicateEmail
		}
		return nil, err
	}

	pair, err := r.bindSecretToPairAtomic(ctx, inv.PairID, secretUser.ID, now)
	if err != nil {
		_, _ = r.users.DeleteOne(context.Background(), bson.M{"_id": secretUser.ID})
		r.rollbackInvitationClaim(inv.ID, secretUser.ID)
		return nil, err
	}
	return pair, nil
}

func (r *MongoRepository) claimInvitationAtomic(
	ctx context.Context,
	code string,
	secretUserID primitive.ObjectID,
	now time.Time,
) (*models.Invitation, error) {
	filter := bson.M{
		"code":       code,
		"used":       false,
		"expires_at": bson.M{"$gt": now},
	}
	update := bson.M{
		"$set": bson.M{
			"used":    true,
			"used_at": now,
			"used_by": secretUserID,
		},
	}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var inv models.Invitation
	err := r.invitations.FindOneAndUpdate(ctx, filter, update, opts).Decode(&inv)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, r.classifyInvitationFailure(ctx, code, now)
		}
		return nil, err
	}
	return &inv, nil
}

func (r *MongoRepository) classifyInvitationFailure(ctx context.Context, code string, now time.Time) error {
	var existing models.Invitation
	err := r.invitations.FindOne(ctx, bson.M{"code": code}).Decode(&existing)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ErrInvalidInvitation
		}
		return err
	}
	if existing.Used {
		return ErrInvitationUsed
	}
	if !existing.ExpiresAt.After(now) {
		return ErrInvitationExpired
	}
	return ErrInvalidInvitation
}

func (r *MongoRepository) bindSecretToPairAtomic(
	ctx context.Context,
	pairID primitive.ObjectID,
	secretUserID primitive.ObjectID,
	now time.Time,
) (*models.Pair, error) {
	filter := bson.M{
		"_id":               pairID,
		"secret_partner_id": nil,
		"status":            models.PairStatusPending,
	}
	update := bson.M{
		"$set": bson.M{
			"secret_partner_id": secretUserID,
			"status":            models.PairStatusActive,
			"paired_at":         now,
		},
	}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var pair models.Pair
	err := r.pairs.FindOneAndUpdate(ctx, filter, update, opts).Decode(&pair)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) || mongo.IsDuplicateKeyError(err) {
			return nil, ErrPairAlreadyActive
		}
		return nil, err
	}
	return &pair, nil
}

func (r *MongoRepository) rollbackInvitationClaim(invID, secretUserID primitive.ObjectID) {
	_, _ = r.invitations.UpdateOne(
		context.Background(),
		bson.M{"_id": invID, "used_by": secretUserID},
		bson.M{
			"$set":   bson.M{"used": false},
			"$unset": bson.M{"used_by": "", "used_at": ""},
		},
	)
}

func (r *MongoRepository) runWithOptionalTransaction(ctx context.Context, fn func(sessCtx context.Context) error) error {
	session, err := r.client.StartSession()
	if err != nil {
		return err
	}
	defer session.EndSession(ctx)

	_, err = session.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (any, error) {
		return nil, fn(sessCtx)
	})
	return err
}

func isTransactionUnsupportedErr(err error) bool {
	if err == nil {
		return false
	}
	var cmdErr mongo.CommandError
	if errors.As(err, &cmdErr) && cmdErr.Code == 20 {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "Transaction numbers are only allowed") ||
		strings.Contains(msg, "sessions are not supported") ||
		strings.Contains(msg, "does not support transactions")
}

// GetUserByEmail finds a user by normalized email.
func (r *MongoRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByID finds a user by ObjectID.
func (r *MongoRepository) GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	err := r.users.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

// GetPairByID finds a pair by ObjectID.
func (r *MongoRepository) GetPairByID(ctx context.Context, id primitive.ObjectID) (*models.Pair, error) {
	var pair models.Pair
	err := r.pairs.FindOne(ctx, bson.M{"_id": id}).Decode(&pair)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &pair, nil
}

// GetInvitationByFreedomPartnerID fetches the invitation and pair owned by a Freedom Partner.
func (r *MongoRepository) GetInvitationByFreedomPartnerID(
	ctx context.Context,
	freedomPartnerID primitive.ObjectID,
) (*models.Invitation, *models.Pair, error) {
	var inv models.Invitation
	if err := r.invitations.FindOne(ctx, bson.M{"freedom_partner_id": freedomPartnerID}).Decode(&inv); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}

	var pair models.Pair
	if err := r.pairs.FindOne(ctx, bson.M{"_id": inv.PairID}).Decode(&pair); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}
	return &inv, &pair, nil
}

// CreateSignal inserts a new signal created by the Secret Partner.
func (r *MongoRepository) CreateSignal(ctx context.Context, signal *models.Signal) (*models.Signal, error) {
	if signal.ID.IsZero() {
		signal.ID = primitive.NewObjectID()
	}
	if signal.CreatedAt.IsZero() {
		signal.CreatedAt = time.Now().UTC()
	}
	signal.Acknowledged = false
	signal.AcknowledgedAt = nil
	signal.AcknowledgedBy = nil

	if _, err := r.signals.InsertOne(ctx, signal); err != nil {
		return nil, err
	}
	return signal, nil
}

// GetFreedomDashboard fetches today's count, unread count, total count, last update time, and recent signals.
func (r *MongoRepository) GetFreedomDashboard(
	ctx context.Context,
	pairID primitive.ObjectID,
	startOfDayUTC, endOfDayUTC time.Time,
	recentLimit int64,
) (*DashboardStats, error) {
	if recentLimit <= 0 {
		recentLimit = 20
	}

	todayTotal, err := r.signals.CountDocuments(ctx, bson.M{
		"pair_id": pairID,
		"created_at": bson.M{
			"$gte": startOfDayUTC,
			"$lt":  endOfDayUTC,
		},
	})
	if err != nil {
		return nil, err
	}

	unreadCount, err := r.signals.CountDocuments(ctx, bson.M{
		"pair_id":      pairID,
		"acknowledged": false,
	})
	if err != nil {
		return nil, err
	}

	totalCount, err := r.signals.CountDocuments(ctx, bson.M{"pair_id": pairID})
	if err != nil {
		return nil, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}, {Key: "_id", Value: -1}}).
		SetLimit(recentLimit)

	cursor, err := r.signals.Find(ctx, bson.M{"pair_id": pairID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	recent := make([]models.Signal, 0)
	if err := cursor.All(ctx, &recent); err != nil {
		return nil, err
	}

	var lastUpdateAt *time.Time
	if len(recent) > 0 {
		t := recent[0].CreatedAt.UTC()
		lastUpdateAt = &t
	}

	return &DashboardStats{
		TodayTotal:    todayTotal,
		UnreadCount:   unreadCount,
		TotalCount:    totalCount,
		LastUpdateAt:  lastUpdateAt,
		RecentSignals: recent,
	}, nil
}

// ListSignalsPaginated returns signals for a pair ordered newest first.
func (r *MongoRepository) ListSignalsPaginated(
	ctx context.Context,
	pairID primitive.ObjectID,
	page, limit int64,
) ([]models.Signal, int64, error) {
	filter := bson.M{"pair_id": pairID}

	total, err := r.signals.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}, {Key: "_id", Value: -1}}).
		SetSkip(skip).
		SetLimit(limit)

	cursor, err := r.signals.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	items := make([]models.Signal, 0)
	if err := cursor.All(ctx, &items); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// AcknowledgeAllPendingSignals atomically marks all unacknowledged signals created at or before cutoffTime as acknowledged.
// Signals created concurrently after cutoffTime remain unread.
func (r *MongoRepository) AcknowledgeAllPendingSignals(
	ctx context.Context,
	pairID, freedomUserID primitive.ObjectID,
	cutoffTime time.Time,
) (int64, int64, error) {
	cutoff := cutoffTime.UTC()
	filter := bson.M{
		"pair_id":      pairID,
		"acknowledged": false,
		"created_at":   bson.M{"$lte": cutoff},
	}
	update := bson.M{
		"$set": bson.M{
			"acknowledged":    true,
			"acknowledged_at": cutoff,
			"acknowledged_by": freedomUserID,
		},
	}

	res, err := r.signals.UpdateMany(ctx, filter, update)
	if err != nil {
		return 0, 0, err
	}

	remainingUnread, err := r.signals.CountDocuments(ctx, bson.M{
		"pair_id":      pairID,
		"acknowledged": false,
	})
	if err != nil {
		return res.ModifiedCount, 0, err
	}

	return res.ModifiedCount, remainingUnread, nil
}

// GetSecretSignalStatus returns strictly aggregate acknowledgement counts for the Secret Partner.
func (r *MongoRepository) GetSecretSignalStatus(ctx context.Context, pairID primitive.ObjectID) (*SecretStatusStats, error) {
	totalSent, err := r.signals.CountDocuments(ctx, bson.M{"pair_id": pairID})
	if err != nil {
		return nil, err
	}

	pendingCount, err := r.signals.CountDocuments(ctx, bson.M{
		"pair_id":      pairID,
		"acknowledged": false,
	})
	if err != nil {
		return nil, err
	}

	return &SecretStatusStats{
		PendingCount: pendingCount,
		TotalSent:    totalSent,
	}, nil
}
