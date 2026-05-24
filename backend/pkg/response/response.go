package response

import (
	"encoding/json"
	"net/http"
)

type Envelope struct {
	Data      any        `json:"data,omitempty"`
	Error     *ErrorBody `json:"error,omitempty"`
	RequestID string     `json:"request_id,omitempty"`
}

type ErrorBody struct {
	Message string `json:"message"`
	Detail  any    `json:"detail,omitempty"`
}

func Write(w http.ResponseWriter, status int, envelope Envelope) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(envelope)
}

func Success(w http.ResponseWriter, status int, data any, requestID string) error {
	return Write(w, status, Envelope{Data: data, RequestID: requestID})
}

func Fail(w http.ResponseWriter, status int, message string, requestID string, detail any) error {
	return Write(w, status, Envelope{Error: &ErrorBody{Message: message, Detail: detail}, RequestID: requestID})
}
