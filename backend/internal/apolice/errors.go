package apolice

import "errors"

type ValidationError struct {
	Message string
}

func (e ValidationError) Error() string {
	return e.Message
}

func ErrValidation(message string) error {
	return ValidationError{Message: message}
}

var ErrNotFound = errors.New("apólice não encontrada")
