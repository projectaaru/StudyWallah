package services

import (
	"errors"
	"net/http"
)

// AppError represents a domain or validation error mapped to an HTTP response.
type AppError struct {
	StatusCode int
	Code       string
	Message    string
	Err        error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func NewBadRequest(code, msg string) *AppError {
	return &AppError{StatusCode: http.StatusBadRequest, Code: code, Message: msg}
}

func NewUnauthorized(code, msg string) *AppError {
	return &AppError{StatusCode: http.StatusUnauthorized, Code: code, Message: msg}
}

func NewForbidden(code, msg string) *AppError {
	return &AppError{StatusCode: http.StatusForbidden, Code: code, Message: msg}
}

func NewNotFound(code, msg string) *AppError {
	return &AppError{StatusCode: http.StatusNotFound, Code: code, Message: msg}
}

func NewConflict(code, msg string) *AppError {
	return &AppError{StatusCode: http.StatusConflict, Code: code, Message: msg}
}

func NewInternal(err error) *AppError {
	return &AppError{
		StatusCode: http.StatusInternalServerError,
		Code:       "INTERNAL_ERROR",
		Message:    "An internal server error occurred",
		Err:        err,
	}
}

// AsAppError extracts an AppError if present.
func AsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}
