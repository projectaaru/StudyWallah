package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/config"
	"github.com/projectaaru/studywallah-backend/internal/database"
	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func seedDatabase(mongoURI, dbName string) {
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
	invitationsColl := db.Collection("invitations")
	signalsColl := db.Collection("signals")

	fmt.Println("[1/4] Clearing existing collections: users, pairs, invitations, signals...")
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

	// Freedom User details
	freedomName := "Kishan"
	freedomEmail := "kishan817835@gmail.com"
	freedomPassword := "Kishan@8178"
	invitationCode := "817835"

	// Secret User details
	secretName := "Arushi"
	secretEmail := "arushi989901@gmail.com"
	secretPassword := "Kishan@8178"

	fmt.Println("[2/4] Generating secure bcrypt password hashes...")
	freedomHash, err := utils.HashPassword(freedomPassword)
	if err != nil {
		log.Fatalf("failed hashing freedom password: %v", err)
	}
	secretHash, err := utils.HashPassword(secretPassword)
	if err != nil {
		log.Fatalf("failed hashing secret password: %v", err)
	}

	now := time.Now().UTC()
	freedomID := primitive.NewObjectID()
	secretID := primitive.NewObjectID()
	pairID := primitive.NewObjectID()
	invitationID := primitive.NewObjectID()

	// 1. Create Pair (Status ACTIVE, both partners bound)
	pair := models.Pair{
		ID:               pairID,
		FreedomPartnerID: freedomID,
		SecretPartnerID:  &secretID,
		Status:           models.PairStatusActive,
		CreatedAt:        now,
		PairedAt:         &now,
	}

	// 2. Create Freedom User
	freedomUser := models.User{
		ID:           freedomID,
		Name:         freedomName,
		Email:        utils.NormalizeEmail(freedomEmail),
		PasswordHash: freedomHash,
		Role:         models.RoleFreedomPartner,
		PairID:       &pairID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// 3. Create Secret User
	secretUser := models.User{
		ID:           secretID,
		Name:         secretName,
		Email:        utils.NormalizeEmail(secretEmail),
		PasswordHash: secretHash,
		Role:         models.RoleSecretPartner,
		PairID:       &pairID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// 4. Create Invitation (Marked Used by Secret User)
	invitation := models.Invitation{
		ID:               invitationID,
		Code:             utils.NormalizeInvitationCode(invitationCode),
		PairID:           pairID,
		FreedomPartnerID: freedomID,
		Used:             true,
		UsedBy:           &secretID,
		UsedAt:           &now,
		ExpiresAt:        now.Add(365 * 24 * time.Hour),
		CreatedAt:        now,
	}

	fmt.Println("[3/4] Inserting Freedom User, Secret User, Pair, and Invitation...")
	if _, err := pairsColl.InsertOne(ctx, pair); err != nil {
		log.Fatalf("failed inserting pair: %v", err)
	}
	if _, err := usersColl.InsertOne(ctx, freedomUser); err != nil {
		log.Fatalf("failed inserting freedom user: %v", err)
	}
	if _, err := usersColl.InsertOne(ctx, secretUser); err != nil {
		log.Fatalf("failed inserting secret user: %v", err)
	}
	if _, err := invitationsColl.InsertOne(ctx, invitation); err != nil {
		log.Fatalf("failed inserting invitation: %v", err)
	}

	fmt.Println("[4/4] Verifying accounts in MongoDB...")
	var checkFreedom, checkSecret models.User
	if err := usersColl.FindOne(ctx, bson.M{"email": utils.NormalizeEmail(freedomEmail)}).Decode(&checkFreedom); err != nil {
		log.Fatalf("failed verifying freedom user: %v", err)
	}
	if !utils.VerifyPassword(freedomPassword, checkFreedom.PasswordHash) {
		log.Fatalf("freedom password verification failed")
	}

	if err := usersColl.FindOne(ctx, bson.M{"email": utils.NormalizeEmail(secretEmail)}).Decode(&checkSecret); err != nil {
		log.Fatalf("failed verifying secret user: %v", err)
	}
	if !utils.VerifyPassword(secretPassword, checkSecret.PasswordHash) {
		log.Fatalf("secret password verification failed")
	}

	var checkPair models.Pair
	if err := pairsColl.FindOne(ctx, bson.M{"_id": pairID}).Decode(&checkPair); err != nil {
		log.Fatalf("failed verifying pair: %v", err)
	}

	fmt.Println("======================================================================")
	fmt.Printf(" SUCCESS FOR DATABASE: %s\n", dbName)
	fmt.Println("----------------------------------------------------------------------")
	fmt.Printf(" [Freedom Partner - Faculty Desk]\n")
	fmt.Printf("   Name:            %s\n", checkFreedom.Name)
	fmt.Printf("   Email:           %s\n", checkFreedom.Email)
	fmt.Printf("   Password:        %s\n", freedomPassword)
	fmt.Printf("   Role:            %s\n", checkFreedom.Role)
	fmt.Printf("   Invitation Code: %s\n", invitationCode)
	fmt.Println("----------------------------------------------------------------------")
	fmt.Printf(" [Secret Partner - Student Prep]\n")
	fmt.Printf("   Name:            %s\n", checkSecret.Name)
	fmt.Printf("   Email:           %s\n", checkSecret.Email)
	fmt.Printf("   Password:        %s\n", secretPassword)
	fmt.Printf("   Role:            %s\n", checkSecret.Role)
	fmt.Println("----------------------------------------------------------------------")
	fmt.Printf(" [Pair Status]\n")
	fmt.Printf("   Pair ID:         %s\n", checkPair.ID.Hex())
	fmt.Printf("   Status:          %s (PAIRED & ACTIVE)\n", checkPair.Status)
	fmt.Println("======================================================================")
}

func main() {
	targetURI := os.Getenv("TARGET_MONGO_URI")
	if targetURI != "" {
		dbName := os.Getenv("MONGO_DB_NAME")
		if dbName == "" {
			dbName = "studywallah"
		}
		seedDatabase(targetURI, dbName)
		return
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed loading config: %v", err)
	}

	seedDatabase(cfg.MongoURI, cfg.MongoDBName)
}
