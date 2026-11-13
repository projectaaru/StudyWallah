package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Invitation represents a single-use, expiring pairing code generated for a Freedom Partner.
type Invitation struct {
	ID               primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Code             string              `bson:"code" json:"code"`
	PairID           primitive.ObjectID  `bson:"pair_id" json:"pair_id"`
	FreedomPartnerID primitive.ObjectID  `bson:"freedom_partner_id" json:"freedom_partner_id"`
	Used             bool                `bson:"used" json:"used"`
	UsedBy           *primitive.ObjectID `bson:"used_by,omitempty" json:"used_by,omitempty"`
	UsedAt           *time.Time          `bson:"used_at,omitempty" json:"used_at,omitempty"`
	ExpiresAt        time.Time           `bson:"expires_at" json:"expires_at"`
	CreatedAt        time.Time           `bson:"created_at" json:"created_at"`
}
