package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	PairStatusPending = "PENDING"
	PairStatusActive  = "ACTIVE"
)

// Pair represents the exclusive 1:1 link between one Freedom Partner and one Secret Partner.
type Pair struct {
	ID               primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	FreedomPartnerID primitive.ObjectID  `bson:"freedom_partner_id" json:"freedom_partner_id"`
	SecretPartnerID  *primitive.ObjectID `bson:"secret_partner_id,omitempty" json:"secret_partner_id,omitempty"`
	Status           string              `bson:"status" json:"status"`
	CreatedAt        time.Time           `bson:"created_at" json:"created_at"`
	PairedAt         *time.Time          `bson:"paired_at,omitempty" json:"paired_at,omitempty"`
}
