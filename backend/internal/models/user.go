package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	RoleFreedomPartner = "FREEDOM_PARTNER"
	RoleSecretPartner  = "SECRET_PARTNER"
)

// User represents a registered StudyWallah user with an immutable server-assigned role.
type User struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Name         string              `bson:"name" json:"name"`
	Email        string              `bson:"email" json:"email"`
	PasswordHash string              `bson:"password_hash" json:"-"`
	Role         string              `bson:"role" json:"role"`
	PairID       *primitive.ObjectID `bson:"pair_id,omitempty" json:"pair_id,omitempty"`
	CreatedAt    time.Time           `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time           `bson:"updated_at" json:"updated_at"`
}
