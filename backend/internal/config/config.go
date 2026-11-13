package config

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds validated application configuration loaded from environment variables.
type Config struct {
	Host                  string
	Port                  string
	AppEnv                string
	MongoURI              string
	MongoDBName           string
	JWTSecret             string
	JWTExpiry             time.Duration
	InvitationExpiry      time.Duration
	Timezone              string
	Location              *time.Location
	RequestTimeout        time.Duration
	CORSAllowedOrigins    []string
}

// Address returns the host:port listen address.
func (c *Config) Address() string {
	return c.Host + ":" + c.Port
}

// Load reads environment variables (and an optional .env file if present) and validates required values.
func Load() (*Config, error) {
	loadDotEnvIfPresent(".env")

	host := getEnvOrDefault("HOST", "0.0.0.0")
	port := getEnvOrDefault("PORT", "8080")
	appEnv := getEnvOrDefault("APP_ENV", "development")
	mongoURI := strings.TrimSpace(os.Getenv("MONGO_URI"))
	mongoDBName := getEnvOrDefault("MONGO_DB_NAME", "studywallah")
	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	tzName := getEnvOrDefault("TIMEZONE", "Asia/Kolkata")
	corsRaw := getEnvOrDefault("CORS_ALLOWED_ORIGINS", "*")

	if mongoURI == "" {
		return nil, errors.New("MONGO_URI environment variable is required")
	}
	if len(jwtSecret) < 32 {
		return nil, errors.New("JWT_SECRET environment variable is required and must be at least 32 characters")
	}

	jwtExpiryHours, err := getPositiveIntEnv("JWT_EXPIRY_HOURS", 168)
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_EXPIRY_HOURS: %w", err)
	}

	invExpiryHours, err := getPositiveIntEnv("INVITATION_EXPIRY_HOURS", 24)
	if err != nil {
		return nil, fmt.Errorf("invalid INVITATION_EXPIRY_HOURS: %w", err)
	}

	reqTimeoutSec, err := getPositiveIntEnv("REQUEST_TIMEOUT_SECONDS", 10)
	if err != nil {
		return nil, fmt.Errorf("invalid REQUEST_TIMEOUT_SECONDS: %w", err)
	}

	loc, err := time.LoadLocation(tzName)
	if err != nil {
		return nil, fmt.Errorf("invalid TIMEZONE %q: %w", tzName, err)
	}

	var corsOrigins []string
	for _, item := range strings.Split(corsRaw, ",") {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			corsOrigins = append(corsOrigins, trimmed)
		}
	}
	if len(corsOrigins) == 0 {
		corsOrigins = []string{"*"}
	}

	return &Config{
		Host:               host,
		Port:               port,
		AppEnv:             appEnv,
		MongoURI:           mongoURI,
		MongoDBName:        mongoDBName,
		JWTSecret:          jwtSecret,
		JWTExpiry:          time.Duration(jwtExpiryHours) * time.Hour,
		InvitationExpiry:   time.Duration(invExpiryHours) * time.Hour,
		Timezone:           tzName,
		Location:           loc,
		RequestTimeout:     time.Duration(reqTimeoutSec) * time.Second,
		CORSAllowedOrigins: corsOrigins,
	}, nil
}

func getEnvOrDefault(key, fallback string) string {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	return val
}

func getPositiveIntEnv(key string, fallback int) (int, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return 0, fmt.Errorf("must be a positive integer")
	}
	return v, nil
}

// loadDotEnvIfPresent populates unset environment variables from a local .env file.
func loadDotEnvIfPresent(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.IndexByte(line, '=')
		if idx <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		val = strings.Trim(val, `"'`)
		if key != "" && os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
		}
	}
}
