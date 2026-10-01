FROM node:24-bookworm-slim AS dependencies

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@10.11.0

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile

RUN mkdir -p /app/data && chown -R node:node /app
COPY --chown=node:node . .

FROM dependencies AS backend-dev
ENV NODE_ENV=development \
    HOST=0.0.0.0 \
    PORT=4000 \
    DATABASE_URL=file:/app/data/dev.db
USER node
RUN pnpm --dir backend db:generate
WORKDIR /app/backend
EXPOSE 4000
# A chave local e o SQLite permanecem no mesmo volume entre reinicializações.
# JWT_SECRET definido no ambiente tem prioridade sobre a chave gerada.
CMD ["sh", "-ec", "umask 077; if [ -z \"$JWT_SECRET\" ]; then if [ ! -s /app/data/.jwt-secret ]; then node -e \"process.stdout.write(require('node:crypto').randomBytes(48).toString('hex'))\" > /app/data/.jwt-secret; fi; export JWT_SECRET=\"$(cat /app/data/.jwt-secret)\"; fi; pnpm db:migrate; exec node --experimental-strip-types src/server.ts"]

FROM dependencies AS frontend-dev
USER node
WORKDIR /app/frontend
EXPOSE 5173
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--configLoader", "native"]
