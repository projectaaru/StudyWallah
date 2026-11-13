package utils

import (
	"net/mail"
	"strings"
)

// NormalizeEmail trims and lowercases an email address.
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// IsValidEmail checks basic RFC 5322 formatting and ensures a non-empty domain with a dot.
func IsValidEmail(email string) bool {
	if len(email) < 5 || len(email) > 254 {
		return false
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return false
	}
	at := strings.LastIndexByte(email, '@')
	if at <= 0 || at >= len(email)-1 {
		return false
	}
	domain := email[at+1:]
	return strings.Contains(domain, ".") && !strings.HasPrefix(domain, ".") && !strings.HasSuffix(domain, ".")
}

// ParsePagination parses 1-based page and bounded limit parameters.
func ParsePagination(pageVal, limitVal int64) (int64, int64) {
	page := pageVal
	if page < 1 {
		page = 1
	}
	limit := limitVal
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}
