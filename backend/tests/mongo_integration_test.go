package tests

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/projectaaru/studywallah-backend/internal/database"
	"github.com/projectaaru/studywallah-backend/internal/models"
	"github.com/projectaaru/studywallah-backend/internal/repository"
	"github.com/projectaaru/studywallah-backend/internal/services"
	"github.com/projectaaru/studywallah-backend/internal/utils"
	"github.com/projectaaru/studywallah-backend/migrations"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestMongoIntegrationEndToEnd(t *testing.T) {
	uri := os.Getenv("MONGO_TEST_URI")
	if uri == "" {
		t.Skip("MONGO_TEST_URI not set; skipping live MongoDB integration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	dbName := "studywallah_test_" + primitive.NewObjectID().Hex()
	client, db, err := database.Connect(ctx, uri, dbName)
	if err != nil {
		t.Fatalf("connect mongo: %v", err)
	}
	defer func() {
		_ = db.Drop(context.Background())
		_ = client.Disconnect(context.Background())
	}()

	if err := migrations.EnsureIndexes(ctx, db); err != nil {
		t.Fatalf("ensure indexes: %v", err)
	}

	loc, _ := time.LoadLocation("Asia/Kolkata")
	repo := repository.NewMongoRepository(client, db)
	jwtMgr := utils.NewJWTManager("mongo-integration-secret-key-over-32-chars", 24*time.Hour)
	authSvc := services.NewAuthService(repo, jwtMgr, 24*time.Hour)
	freedomSvc := services.NewFreedomService(repo, loc, "Asia/Kolkata")
	secretSvc := services.NewSecretService(repo)

	fAuth, err := authSvc.RegisterFreedom(ctx, models.RegisterFreedomRequest{
		Name:     "Mongo Freedom",
		Email:    "mongo.freedom@example.com",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatalf("register freedom: %v", err)
	}

	sAuth, err := authSvc.JoinSecret(ctx, models.JoinSecretRequest{
		Name:           "Mongo Secret",
		Email:          "mongo.secret@example.com",
		Password:       "Password123!",
		InvitationCode: fAuth.Invitation.Code,
	})
	if err != nil {
		t.Fatalf("join secret: %v", err)
	}

	fID, _ := primitive.ObjectIDFromHex(fAuth.User.ID)
	sID, _ := primitive.ObjectIDFromHex(sAuth.User.ID)
	fUser, _ := repo.GetUserByID(ctx, fID)
	sUser, _ := repo.GetUserByID(ctx, sID)

	if _, err := secretSvc.CreateSignal(ctx, sUser, models.CreateSignalRequest{Content: "Mongo live signal"}); err != nil {
		t.Fatalf("create signal: %v", err)
	}

	statusBefore, err := secretSvc.GetStatus(ctx, sUser)
	if err != nil || statusBefore.Status != models.SignalStatusRed {
		t.Fatalf("expected RED status before ack, got %+v err=%v", statusBefore, err)
	}

	if _, err := freedomSvc.ViewedAll(ctx, fUser); err != nil {
		t.Fatalf("viewed all: %v", err)
	}

	statusAfter, err := secretSvc.GetStatus(ctx, sUser)
	if err != nil || statusAfter.Status != models.SignalStatusGreen {
		t.Fatalf("expected GREEN status after ack, got %+v err=%v", statusAfter, err)
	}
}
