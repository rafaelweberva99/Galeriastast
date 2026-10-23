# Imagen de producción de GaleríaStats (usada por Railway, Render, Fly.io o cualquier host con Docker).
FROM node:22-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# La base SQLite vive en un volumen persistente montado en /data (ver railway.json / README).
ENV DATABASE_PATH=/data/galeriastats.db
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
