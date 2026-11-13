package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/database"
	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func updateArushiPassword(mongoURI, dbName string) {
	fmt.Printf("\nConnecting to MongoDB: %s (db: %s)...\n", mongoURI, dbName)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	client, db, err := database.Connect(ctx, mongoURI, dbName)
	if err != nil {
		log.Fatalf("failed connecting to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	usersColl := db.Collection("users")
	pairsColl := db.Collection("pairs")
	signalsColl := db.Collection("signals")
	invitationsColl := db.Collection("invitations")

	targetEmail := "arushi989901@gmail.com"
	newPassword := "Kishan@8178353728"

	var existingUser models.User
	err = usersColl.FindOne(ctx, bson.M{"email": targetEmail}).Decode(&existingUser)
	if err != nil {
		log.Fatalf("User %s not found in database: %v", targetEmail, err)
	}

	fmt.Printf("[+] Found user: %s (Current ID: %s, Role: %s)\n", existingUser.Email, existingUser.ID.Hex(), existingUser.Role)

	newHash, err := utils.HashPassword(newPassword)
	if err != nil {
		log.Fatalf("failed hashing new password: %v", err)
	}

	oldID := existingUser.ID
	newID := primitive.NewObjectID()
	now := time.Now().UTC()

	// 1. Delete old user document and insert with new ID and new password hash
	// This immediately invalidates every active JWT token on all logged-in devices.
	if _, err := usersColl.DeleteOne(ctx, bson.M{"_id": oldID}); err != nil {
		log.Fatalf("failed deleting old user record: %v", err)
	}

	newUser := models.User{
		ID:           newID,
		Name:         existingUser.Name,
		Email:        existingUser.Email,
		PasswordHash: newHash,
		Role:         existingUser.Role,
		PairID:       existingUser.PairID,
		CreatedAt:    existingUser.CreatedAt,
		UpdatedAt:    now,
	}

	if _, err := usersColl.InsertOne(ctx, newUser); err != nil {
		log.Fatalf("failed inserting updated user record: %v", err)
	}
	fmt.Printf("[+] User %s updated with NEW ID: %s and NEW password hash.\n", targetEmail, newID.Hex())

	// 2. Update pair references
	resPair, err := pairsColl.UpdateMany(ctx, bson.M{"secret_partner_id": oldID}, bson.M{"$set": bson.M{"secret_partner_id": newID, "updated_at": now}})
	if err != nil {
		log.Fatalf("failed updating pairs: %v", err)
	}
	fmt.Printf("[+] Updated %d pair(s) with new secret partner ID.\n", resPair.ModifiedCount)

	// 3. Update signal references
	resSignals, err := signalsColl.UpdateMany(ctx, bson.M{"sender_id": oldID}, bson.M{"$set": bson.M{"sender_id": newID}})
	if err != nil {
		log.Fatalf("failed updating signals: %v", err)
	}
	fmt.Printf("[+] Updated %d signal(s) with new sender ID.\n", resSignals.ModifiedCount)

	// 4. Update invitations references
	resInv, err := invitationsColl.UpdateMany(ctx, bson.M{"used_by": oldID}, bson.M{"$set": bson.M{"used_by": newID}})
	if err != nil {
		log.Fatalf("failed updating invitations: %v", err)
	}
	fmt.Printf("[+] Updated %d invitation(s) with new used_by ID.\n", resInv.ModifiedCount)

	fmt.Println("[+] Password successfully changed and all logged-in sessions invalidated!")
}

func main() {
	atlasURI := "mongodb+srv://kishan8178:Kishan%408178@foraaru.iwzrdhf.mongodb.net/studywallah?retryWrites=true&w=majority"
	dbName := "studywallah"

	fmt.Println("=== Updating Arushi's Password in MongoDB Atlas ===")
	updateArushiPassword(atlasURI, dbName)

	// Also check local MongoDB if running
	localURI := "mongodb://127.0.0.1:27017"
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	client, _, err := database.Connect(ctx, localURI, dbName)
	if err == nil {
		_ = client.Disconnect(ctx)
		fmt.Println("\n=== Updating Arushi's Password in Local MongoDB ===")
		updateArushiPassword(localURI, dbName)
	}
}
