# ==============================================================================
# StudyWallah Full-Stack Multi-Stage Dockerfile
# Builds Expo Web assets, embeds them into Go binary, runs in minimal Alpine
# ==============================================================================

# Stage 1: Frontend Build (Expo Web)
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./
ENV EXPO_PUBLIC_API_URL=""
RUN npx expo export --platform web

# Stage 2: Backend Build (Go embed)
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app/backend

RUN apk add --no-cache ca-certificates tzdata

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
# Copy exported web assets into Go embed directory
COPY --from=frontend-builder /app/frontend/dist ./internal/web/dist

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o /app/studywallah-server ./cmd/api

# Stage 3: Minimal Production Image
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=backend-builder /app/studywallah-server /app/studywallah-server

ENV HOST=0.0.0.0
ENV PORT=8080
ENV APP_ENV=production
ENV TIMEZONE=Asia/Kolkata

EXPOSE 8080

CMD ["/app/studywallah-server"]
