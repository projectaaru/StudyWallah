package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/config"
	"github.com/projectaaru/studywallah-backend/internal/database"
	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed loading config: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	client, db, err := database.Connect(ctx, cfg.MongoURI, cfg.MongoDBName)
	if err != nil {
		log.Fatalf("failed connecting to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	usersColl := db.Collection("users")
	pairsColl := db.Collection("pairs")
	invitationsColl := db.Collection("invitations")
	signalsColl := db.Collection("signals")

	fmt.Println("[1/4] Clearing existing data in collections: users, pairs, invitations, signals...")
	if _, err := signalsColl.DeleteMany(ctx, bson.M{}); err != nil {
		log.Fatalf("failed clearing signals: %v", err)
	}
	if _, err := invitationsColl.DeleteMany(ctx, bson.M{}); err != nil {
		log.Fatalf("failed clearing invitations: %v", err)
	}
	if _, err := pairsColl.DeleteMany(ctx, bson.M{}); err != nil {
		log.Fatalf("failed clearing pairs: %v", err)
	}
	if _, err := usersColl.DeleteMany(ctx, bson.M{}); err != nil {
		log.Fatalf("failed clearing users: %v", err)
	}
	fmt.Println("[+] Old data cleared successfully.")

	email := "kishan817835@gmail.com"
	rawPassword := "Kishan@8178"
	invitationCode := "817835"
	name := "Kishan"

	fmt.Printf("[2/4] Hashing password for %s...\n", email)
	hash, err := utils.HashPassword(rawPassword)
	if err != nil {
		log.Fatalf("failed hashing password: %v", err)
	}

	now := time.Now().UTC()
	userID := primitive.NewObjectID()
	pairID := primitive.NewObjectID()
	invitationID := primitive.NewObjectID()

	user := models.User{
		ID:           userID,
		Name:         name,
		Email:        utils.NormalizeEmail(email),
		PasswordHash: hash,
		Role:         models.RoleFreedomPartner,
		PairID:       &pairID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	pair := models.Pair{
		ID:               pairID,
		FreedomPartnerID: userID,
		Status:           models.PairStatusPending,
		CreatedAt:        now,
	}

	invitation := models.Invitation{
		ID:               invitationID,
		Code:             utils.NormalizeInvitationCode(invitationCode),
		PairID:           pairID,
		FreedomPartnerID: userID,
		Used:             false,
		ExpiresAt:        now.Add(365 * 24 * time.Hour), // 1 year validity
		CreatedAt:        now,
	}

	fmt.Println("[3/4] Inserting new Freedom User, Pair, and Invitation into MongoDB...")
	if _, err := usersColl.InsertOne(ctx, user); err != nil {
		log.Fatalf("failed inserting user: %v", err)
	}
	if _, err := pairsColl.InsertOne(ctx, pair); err != nil {
		log.Fatalf("failed inserting pair: %v", err)
	}
	if _, err := invitationsColl.InsertOne(ctx, invitation); err != nil {
		log.Fatalf("failed inserting invitation: %v", err)
	}

	fmt.Println("[4/4] Verifying created Freedom account...")
	var checkUser models.User
	if err := usersColl.FindOne(ctx, bson.M{"email": utils.NormalizeEmail(email)}).Decode(&checkUser); err != nil {
		log.Fatalf("failed verifying user: %v", err)
	}
	if !utils.VerifyPassword(rawPassword, checkUser.PasswordHash) {
		log.Fatalf("password verification failed")
	}

	var checkInv models.Invitation
	if err := invitationsColl.FindOne(ctx, bson.M{"code": invitationCode}).Decode(&checkInv); err != nil {
		log.Fatalf("failed verifying invitation code: %v", err)
	}

	fmt.Println("======================================================================")
	fmt.Println(" FREEDOM USER CREATED SUCCESSFULLY!")
	fmt.Printf(" Email:           %s\n", checkUser.Email)
	fmt.Printf(" Password:        %s\n", rawPassword)
	fmt.Printf(" Role:            %s\n", checkUser.Role)
	fmt.Printf(" Invitation Code: %s\n", checkInv.Code)
	fmt.Printf(" Pair ID:         %s\n", checkInv.PairID.Hex())
	fmt.Printf(" Expires At:      %s\n", checkInv.ExpiresAt.Format(time.RFC3339))
	fmt.Println("======================================================================")
}
