package migrations

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureIndexes creates required unique and query indexes across all MongoDB collections.
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	usersIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_user_email"),
		},
	}
	if _, err := db.Collection("users").Indexes().CreateMany(ctx, usersIndexes); err != nil {
		return fmt.Errorf("create users indexes: %w", err)
	}

	pairsIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "freedom_partner_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_pair_freedom_partner"),
		},
		{
			Keys: bson.D{{Key: "secret_partner_id", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetName("uniq_pair_secret_partner").
				SetPartialFilterExpression(bson.D{{Key: "secret_partner_id", Value: bson.D{{Key: "$type", Value: "objectId"}}}}),
		},
	}
	if _, err := db.Collection("pairs").Indexes().CreateMany(ctx, pairsIndexes); err != nil {
		return fmt.Errorf("create pairs indexes: %w", err)
	}

	invitationsIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "code", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_invitation_code"),
		},
		{
			Keys:    bson.D{{Key: "pair_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("uniq_invitation_pair"),
		},
	}
	if _, err := db.Collection("invitations").Indexes().CreateMany(ctx, invitationsIndexes); err != nil {
		return fmt.Errorf("create invitations indexes: %w", err)
	}

	signalsIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "pair_id", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("idx_signals_pair_created"),
		},
		{
			Keys:    bson.D{{Key: "pair_id", Value: 1}, {Key: "acknowledged", Value: 1}, {Key: "created_at", Value: 1}},
			Options: options.Index().SetName("idx_signals_pair_ack_created"),
		},
	}
	if _, err := db.Collection("signals").Indexes().CreateMany(ctx, signalsIndexes); err != nil {
		return fmt.Errorf("create signals indexes: %w", err)
	}

	return nil
}
