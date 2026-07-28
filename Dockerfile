FROM python:3.12-slim AS builder
WORKDIR /build
COPY src/ ./src/
RUN pip install --no-cache-dir -r src/requirements.txt
RUN python src/build.py dist/

FROM nginx:stable-bookworm
COPY --from=builder /build/dist/ /usr/share/nginx/html/
CMD ["nginx", "-g", "daemon off;"]
