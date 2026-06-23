package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"time"

	"grupo4/seguros/pkg/response"
)

type contextKey string

const requestIDKey contextKey = "request_id"

func RequestIDFromContext(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDKey).(string)
	return requestID
}

func Chain(handler http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := newRequestID()
		ctx := context.WithValue(r.Context(), requestIDKey, requestID)
		w.Header().Set("X-Request-ID", requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(recorder, r)
		log.Printf("method=%s path=%s status=%d duration=%s request_id=%s", r.Method, r.URL.Path, recorder.statusCode, time.Since(start), RequestIDFromContext(r.Context()))
	})
}

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				requestID := RequestIDFromContext(r.Context())
				log.Printf("panic recovered request_id=%s panic=%v", requestID, recovered)
				_ = response.Fail(w, http.StatusInternalServerError, "Erro interno do servidor", requestID, nil)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowed := false

			if len(allowedOrigins) == 0 {
				allowed = true // Fallback to allow all if not configured (development mode)
			} else {
				for _, o := range allowedOrigins {
					if o == "*" || o == origin {
						allowed = true
						break
					}
				}
			}

			if allowed && origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if len(allowedOrigins) == 0 {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func newRequestID() string {
	buffer := make([]byte, 8)
	if _, err := rand.Read(buffer); err != nil {
		return time.Now().UTC().Format("20060102T150405.000000000")
	}
	return hex.EncodeToString(buffer)
}
