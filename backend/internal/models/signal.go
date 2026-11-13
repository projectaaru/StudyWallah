package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	SignalStatusRed   = "RED"
	SignalStatusGreen = "GREEN"
)

// Signal represents a private update sent by the Secret Partner to the Freedom Partner.
type Signal struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	PairID         primitive.ObjectID  `bson:"pair_id" json:"pair_id"`
	SenderID       primitive.ObjectID  `bson:"sender_id" json:"sender_id"`
	Content        string              `bson:"content" json:"content"`
	CreatedAt      time.Time           `bson:"created_at" json:"created_at"`
	Acknowledged   bool                `bson:"acknowledged" json:"acknowledged"`
	AcknowledgedAt *time.Time          `bson:"acknowledged_at,omitempty" json:"acknowledged_at,omitempty"`
	AcknowledgedBy *primitive.ObjectID `bson:"acknowledged_by,omitempty" json:"acknowledged_by,omitempty"`
}
