# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN mkdir -p /home/node/.cache /home/node/.npm && \
    chown -R node:node /app /home/node

USER node

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
ARG NEXT_PUBLIC_BASE_PATH=/dashboard-eoc
ARG NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL=http://sipkk-baru.test
ARG NEXT_PUBLIC_MEDIA_MONITORING_URL=https://pusatkrisis.kemkes.go.id/dashboard-media
ARG NEXT_PUBLIC_NLP_URL=https://pusatkrisis.kemkes.go.id/nlp/
ARG SIPKK_BACKEND_BASE_URL=http://sipkk-baru.test
ARG SIPKK_DASHBOARD_TTOKEN
ARG API_INDONESIA_KEY
ARG GEMINI_API_KEY
ARG GOOGLE_AI_API_KEY
RUN printf '%s\n' \
  "NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH" \
  "NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL=$NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL" \
  "NEXT_PUBLIC_MEDIA_MONITORING_URL=$NEXT_PUBLIC_MEDIA_MONITORING_URL" \
  "NEXT_PUBLIC_NLP_URL=$NEXT_PUBLIC_NLP_URL" \
  "SIPKK_BACKEND_BASE_URL=$SIPKK_BACKEND_BASE_URL" \
  "SIPKK_DASHBOARD_TTOKEN=$SIPKK_DASHBOARD_TTOKEN" \
  "API_INDONESIA_KEY=$API_INDONESIA_KEY" \
  "GEMINI_API_KEY=$GEMINI_API_KEY" \
  "GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY" > .env
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=node:node /app/.env ./.env
RUN mkdir /app/node_modules && chown node:node /app/node_modules
USER node
EXPOSE 3000
CMD ["sh", "-c", "if [ ! -x /app/node_modules/.bin/next ]; then npm ci --omit=dev; fi && npm start"]
