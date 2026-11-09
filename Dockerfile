# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app
ARG SITE_URL=https://dealdock.example.com
ENV VITE_SITE_URL=${SITE_URL}
COPY mvp/package.json mvp/package-lock.json ./
# Optional CA secret supports cloud proxies without baking their certificate into images.
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY mvp/ ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS frontend
COPY --chmod=644 deployment/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build --chown=101:101 /app/dist /usr/share/nginx/html
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ready || exit 1

FROM node:24-bookworm-slim AS backend-build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY backend/ ./
RUN npm run build
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm prune --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS backend
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=backend-build --chown=node:node /app/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /app/package.json ./package.json
COPY --from=backend-build --chown=node:node /app/server.js ./server.js
COPY --from=backend-build --chown=node:node /app/src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=6s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health',{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

FROM python:3.12-slim AS ai-build
WORKDIR /app
RUN python -m venv /opt/venv
COPY ai-service/requirements.txt ./requirements.txt
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export PIP_CERT=/run/secrets/proxy_ca; fi; \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS ai
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY --from=ai-build /opt/venv /opt/venv
COPY --chown=10001:10001 ai-service/main.py ./main.py
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=6s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5)"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
