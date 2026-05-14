# syntax=docker/dockerfile:1.7

# =============================================================================
# Imagem do Sistema de Gestão de Chamados
#
# Multi-stage build:
#   Stage 1 (frontend-build): compila o React/Vite, gera /app/dist
#   Stage 2 (runtime):        instala o backend Node + copia o dist do stage 1
#
# A imagem final roda UM processo Node que serve:
#   - API REST   em /api/*
#   - Frontend  em todas as outras rotas (SPA fallback para index.html)
#
# Como construir:
#   docker build -t gestao-chamados:latest .
#
# Como rodar (precisa do server/.env com credenciais do MySQL):
#   docker run -d --name gestao-chamados -p 3001:3001 \
#     --env-file server/.env -e NODE_ENV=production \
#     gestao-chamados:latest
#
# Atalho com docker-compose:
#   docker compose up -d --build
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build do frontend (Vite + React)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Instala dependências (camada cacheável)
COPY package.json package-lock.json ./
RUN npm ci

# Copia código-fonte do frontend
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public/ ./public/
COPY src/ ./src/

# Build de produção — gera /app/dist
# VITE_API_URL não é definido → BASE_URL fica "" → URLs relativas
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Runtime (backend Node + frontend estático)
# -----------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app/server

# Instala dependências do backend (incluindo tsx para rodar TS direto)
COPY server/package.json server/package-lock.json ./
RUN npm ci

# Copia código-fonte do backend
COPY server/ ./

# Copia o build do frontend do stage anterior
COPY --from=frontend-build /app/dist /app/dist

# Variáveis de ambiente padrão (podem ser sobrescritas em runtime)
ENV NODE_ENV=production
ENV PORT=3001
ENV FRONTEND_DIST=/app/dist

EXPOSE 3001

# Comando: usa o npm start do server/package.json (que invoca tsx)
CMD ["npm", "start"]
