package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/repository"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthService handles registration, secret-partner pairing, login, and identity lookup.
type AuthService struct {
	repo             repository.Repository
	jwt              *utils.JWTManager
	invitationExpiry time.Duration
}

// NewAuthService constructs an AuthService.
func NewAuthService(repo repository.Repository, jwt *utils.JWTManager, invitationExpiry time.Duration) *AuthService {
	return &AuthService{
		repo:             repo,
		jwt:              jwt,
		invitationExpiry: invitationExpiry,
	}
}

// RegisterFreedom creates a FREEDOM_PARTNER account, a pending pair, and a single-use invitation code.
func (s *AuthService) RegisterFreedom(ctx context.Context, req models.RegisterFreedomRequest) (*models.AuthResponse, error) {
	name := strings.TrimSpace(req.Name)
	email := utils.NormalizeEmail(req.Email)

	if err := validateAccountInput(name, email, req.Password); err != nil {
		return nil, err
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, NewInternal(err)
	}

	now := time.Now().UTC()
	var createdUser *models.User
	var createdInv *models.Invitation

	const maxAttempts = 5
	for attempt := 0; attempt < maxAttempts; attempt++ {
		code, err := utils.GenerateInvitationCode(10)
		if err != nil {
			return nil, NewInternal(err)
		}

		user := &models.User{
			ID:           primitive.NewObjectID(),
			Name:         name,
			Email:        email,
			PasswordHash: hash,
			Role:         models.RoleFreedomPartner,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		pair := &models.Pair{
			ID:        primitive.NewObjectID(),
			Status:    models.PairStatusPending,
			CreatedAt: now,
		}
		inv := &models.Invitation{
			ID:        primitive.NewObjectID(),
			Code:      code,
			ExpiresAt: now.Add(s.invitationExpiry),
			CreatedAt: now,
		}

		err = s.repo.CreateFreedomPartnerWithPairAndInvitation(ctx, user, pair, inv)
		if err == nil {
			createdUser = user
			createdInv = inv
			break
		}
		if errors.Is(err, repository.ErrDuplicateInvitationCode) {
			continue
		}
		if errors.Is(err, repository.ErrDuplicateEmail) {
			return nil, NewConflict("EMAIL_EXISTS", "An account with this email already exists")
		}
		return nil, NewInternal(err)
	}

	if createdUser == nil || createdInv == nil {
		return nil, NewInternal(errors.New("failed to generate unique invitation code"))
	}

	token, expiresAt, err := s.jwt.Generate(createdUser.ID.Hex(), createdUser.Role)
	if err != nil {
		return nil, NewInternal(err)
	}

	return &models.AuthResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      toUserDTO(createdUser),
		Invitation: &models.InvitationDTO{
			Code:       createdInv.Code,
			ExpiresAt:  createdInv.ExpiresAt,
			Used:       createdInv.Used,
			PairStatus: models.PairStatusPending,
		},
	}, nil
}

// JoinSecret validates a single-use invitation code and atomically binds a new SECRET_PARTNER to the pair.
func (s *AuthService) JoinSecret(ctx context.Context, req models.JoinSecretRequest) (*models.AuthResponse, error) {
	name := strings.TrimSpace(req.Name)
	email := utils.NormalizeEmail(req.Email)
	code := utils.NormalizeInvitationCode(req.InvitationCode)

	if err := validateAccountInput(name, email, req.Password); err != nil {
		return nil, err
	}
	if len(code) < 6 || len(code) > 32 {
		return nil, NewBadRequest("INVALID_INVITATION_FORMAT", "Invitation code is required")
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, NewInternal(err)
	}

	now := time.Now().UTC()
	secretUser := &models.User{
		ID:           primitive.NewObjectID(),
		Name:         name,
		Email:        email,
		PasswordHash: hash,
		Role:         models.RoleSecretPartner,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	_, err = s.repo.JoinSecretPartnerWithInvitation(ctx, code, secretUser)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrDuplicateEmail):
			return nil, NewConflict("EMAIL_EXISTS", "An account with this email already exists")
		case errors.Is(err, repository.ErrInvalidInvitation):
			return nil, NewNotFound("INVALID_INVITATION", "Invitation code is invalid")
		case errors.Is(err, repository.ErrInvitationUsed):
			return nil, NewConflict("INVITATION_USED", "Invitation code has already been used")
		case errors.Is(err, repository.ErrInvitationExpired):
			return nil, NewBadRequest("INVITATION_EXPIRED", "Invitation code has expired")
		case errors.Is(err, repository.ErrPairAlreadyActive):
			return nil, NewConflict("PAIR_ALREADY_ACTIVE", "This pair already has a Secret Partner")
		default:
			return nil, NewInternal(err)
		}
	}

	token, expiresAt, err := s.jwt.Generate(secretUser.ID.Hex(), secretUser.Role)
	if err != nil {
		return nil, NewInternal(err)
	}

	return &models.AuthResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      toUserDTO(secretUser),
	}, nil
}

// Login authenticates an existing user and returns a signed JWT.
func (s *AuthService) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {
	email := utils.NormalizeEmail(req.Email)
	if !utils.IsValidEmail(email) || req.Password == "" {
		return nil, NewBadRequest("VALIDATION_ERROR", "Valid email and password are required")
	}

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, NewUnauthorized("INVALID_CREDENTIALS", "Invalid email or password")
		}
		return nil, NewInternal(err)
	}

	if !utils.VerifyPassword(req.Password, user.PasswordHash) {
		return nil, NewUnauthorized("INVALID_CREDENTIALS", "Invalid email or password")
	}

	token, expiresAt, err := s.jwt.Generate(user.ID.Hex(), user.Role)
	if err != nil {
		return nil, NewInternal(err)
	}

	return &models.AuthResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      toUserDTO(user),
	}, nil
}

// GetMe loads the current authenticated user's profile and pair status from the database.
func (s *AuthService) GetMe(ctx context.Context, user *models.User) (*models.MeResponse, error) {
	if user == nil {
		return nil, NewUnauthorized("UNAUTHORIZED", "Authentication required")
	}

	pairStatus := models.PairStatusPending
	if user.PairID != nil {
		pair, err := s.repo.GetPairByID(ctx, *user.PairID)
		if err != nil && !errors.Is(err, repository.ErrNotFound) {
			return nil, NewInternal(err)
		}
		if pair != nil {
			pairStatus = pair.Status
		}
	}

	return &models.MeResponse{
		User:       toUserDTO(user),
		PairStatus: pairStatus,
	}, nil
}

func validateAccountInput(name, email, password string) error {
	if len(name) < 2 || len(name) > 80 {
		return NewBadRequest("INVALID_NAME", "Name must be between 2 and 80 characters")
	}
	if !utils.IsValidEmail(email) {
		return NewBadRequest("INVALID_EMAIL", "A valid email address is required")
	}
	if len(password) < 8 || len(password) > 128 {
		return NewBadRequest("INVALID_PASSWORD", "Password must be between 8 and 128 characters")
	}
	return nil
}

func toUserDTO(u *models.User) models.UserDTO {
	pairHex := ""
	if u.PairID != nil {
		pairHex = u.PairID.Hex()
	}
	return models.UserDTO{
		ID:        u.ID.Hex(),
		Name:      u.Name,
		Email:     u.Email,
		Role:      u.Role,
		PairID:    pairHex,
		CreatedAt: u.CreatedAt,
	}
}
