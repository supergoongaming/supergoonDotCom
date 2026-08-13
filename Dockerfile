FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/templates ./templates/
COPY --from=builder /app/static ./static/
COPY --from=builder /app/content ./content/
EXPOSE 8080
CMD ["./server"]
