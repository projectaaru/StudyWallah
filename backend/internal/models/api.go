package models

import "time"

// RegisterFreedomRequest is the payload for Freedom Partner account creation.
type RegisterFreedomRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// JoinSecretRequest is the payload for Secret Partner registration using an invitation code.
type JoinSecretRequest struct {
	Name           string `json:"name"`
	Email          string `json:"email"`
	Password       string `json:"password"`
	InvitationCode string `json:"invitation_code"`
}

// LoginRequest is the payload for credential authentication.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// CreateSignalRequest is the payload for sending a signal as Secret Partner.
type CreateSignalRequest struct {
	Content string `json:"content"`
}

// UserDTO represents sanitized user information returned in API responses.
type UserDTO struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	PairID    string    `json:"pair_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// InvitationDTO represents invitation details visible only to the owning Freedom Partner.
type InvitationDTO struct {
	Code       string     `json:"code"`
	ExpiresAt  time.Time  `json:"expires_at"`
	Used       bool       `json:"used"`
	UsedAt     *time.Time `json:"used_at,omitempty"`
	PairStatus string     `json:"pair_status"`
}

// AuthResponse is returned after registration, join, or login.
type AuthResponse struct {
	Token      string         `json:"token"`
	ExpiresAt  time.Time      `json:"expires_at"`
	User       UserDTO        `json:"user"`
	Invitation *InvitationDTO `json:"invitation,omitempty"`
}

// MeResponse represents the authenticated user's current profile and pair status.
type MeResponse struct {
	User       UserDTO `json:"user"`
	PairStatus string  `json:"pair_status"`
}

// SignalItemDTO represents a signal entry visible to the Freedom Partner.
type SignalItemDTO struct {
	ID             string     `json:"id"`
	Content        string     `json:"content"`
	CreatedAt      time.Time  `json:"created_at"`
	Acknowledged   bool       `json:"acknowledged"`
	AcknowledgedAt *time.Time `json:"acknowledged_at,omitempty"`
}

// FreedomDashboardResponse holds aggregated dashboard metrics and recent signals for Freedom Partner.
type FreedomDashboardResponse struct {
	TodayTotal    int64           `json:"today_total"`
	UnreadCount   int64           `json:"unread_count"`
	TotalCount    int64           `json:"total_count"`
	LastUpdateAt  *time.Time      `json:"last_update_at,omitempty"`
	Status        string          `json:"status"`
	PairStatus    string          `json:"pair_status"`
	Timezone      string          `json:"timezone"`
	RecentSignals []SignalItemDTO `json:"recent_signals"`
}

// FreedomSignalsPageResponse holds paginated signals for Freedom Partner.
type FreedomSignalsPageResponse struct {
	Signals    []SignalItemDTO `json:"signals"`
	Page       int64           `json:"page"`
	Limit      int64           `json:"limit"`
	Total      int64           `json:"total"`
	TotalPages int64           `json:"total_pages"`
}

// ViewedAllResponse represents the result of acknowledging all pending signals.
type ViewedAllResponse struct {
	AcknowledgedCount int64     `json:"acknowledged_count"`
	UnreadCount       int64     `json:"unread_count"`
	Status            string    `json:"status"`
	AcknowledgedAt    time.Time `json:"acknowledged_at"`
}

// SecretSignalReceiptDTO represents minimal confirmation when Secret Partner sends a signal.
type SecretSignalReceiptDTO struct {
	ID           string    `json:"id"`
	CreatedAt    time.Time `json:"created_at"`
	Acknowledged bool      `json:"acknowledged"`
}

// SecretCreateSignalResponse is returned when Secret Partner creates a signal.
type SecretCreateSignalResponse struct {
	Signal SecretSignalReceiptDTO `json:"signal"`
	Status string                 `json:"status"`
}

// SecretStatusResponse returns strictly aggregate acknowledgement status for Secret Partner.
// No message content or Freedom Partner activity timestamps are exposed.
type SecretStatusResponse struct {
	Status          string `json:"status"`
	AllAcknowledged bool   `json:"all_acknowledged"`
	PendingCount    int64  `json:"pending_count"`
	TotalSent       int64  `json:"total_sent"`
}

// ErrorResponse is the standard error envelope returned by the API.
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail carries a machine-readable code and human-readable message.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
