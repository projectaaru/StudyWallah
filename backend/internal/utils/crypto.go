package utils

import (
	"crypto/rand"
	"math/big"
	"strings"
)

// Unambiguous uppercase alphanumeric alphabet (excludes 0, O, 1, I).
const invitationAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// GenerateInvitationCode generates a cryptographically random invitation code of the requested length.
func GenerateInvitationCode(length int) (string, error) {
	if length <= 0 {
		length = 10
	}
	maxIdx := big.NewInt(int64(len(invitationAlphabet)))
	out := make([]byte, length)
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, maxIdx)
		if err != nil {
			return "", err
		}
		out[i] = invitationAlphabet[n.Int64()]
	}
	return string(out), nil
}

// NormalizeInvitationCode strips spaces and hyphens and uppercases user-submitted invitation codes.
func NormalizeInvitationCode(code string) string {
	cleaned := strings.TrimSpace(code)
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	return strings.ToUpper(cleaned)
}
