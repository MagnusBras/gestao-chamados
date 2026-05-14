# Deploy — Sistema de Gestão de Chamados

Documento de instalação para a equipe de TI.

---

## Visão geral

Aplicação web interna em Node.js + React, dockerizada em **um único container** que serve tanto a API quanto o frontend pela mesma porta (3001 por padrão).

- **Frontend**: React + Vite (servido como arquivos estáticos pelo backend)
- **Backend**: Node.js + Express, autenticação JWT
- **Banco de dados**: **externo** — MySQL já existente em `10.0.20.200:3340`, banco `tickets_db`

O container **não** contém o banco; apenas se conecta a ele.

---

## Pré-requisitos no servidor

1. **Docker Engine** (versão 20.10+) instalado.
   - Linux: `curl -fsSL https://get.docker.com | sudo sh`
   - Windows Server: Docker Desktop ou Mirantis Container Runtime
   - Verificar: `docker --version && docker compose version`
2. **Conectividade até o MySQL**: o servidor precisa alcançar `10.0.20.200:3340`.
   - Linux: `nc -zv 10.0.20.200 3340`
   - Windows: `Test-NetConnection 10.0.20.200 -Port 3340`
3. **Porta de saída livre**: por padrão, a API roda na **3001**. Pode ser trocada (ver passo 3 abaixo).
4. **Acesso à internet durante o build inicial**: o `docker compose up --build` baixa a imagem base do Node e pacotes npm (~150 MB). Após o primeiro build, não precisa mais de internet.

---

## Passo a passo

### 1) Extrair os arquivos

Descompactar o ZIP em uma pasta dedicada, por exemplo:

- Linux: `/opt/gestao-chamados`
- Windows: `C:\apps\gestao-chamados`

Estrutura esperada após extrair:
```
gestao-chamados/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── src/                   ← frontend
├── server/                ← backend
│   ├── package.json
│   ├── src/
│   ├── sql/               ← scripts de migração
│   └── .env.example       ← MODELO; criar .env baseado neste
└── DEPLOY.md              ← este arquivo
```

### 2) Criar o arquivo de credenciais `server/.env`

```bash
cd gestao-chamados
cp server/.env.example server/.env
# editar server/.env (nano, vim, notepad)
```

Preencher:

```ini
DB_HOST=10.0.20.200
DB_PORT=3340
DB_USER=gestao_api           # usuário MySQL com SELECT/INSERT/UPDATE/DELETE em tickets_db
DB_PASSWORD="senha_real"     # se houver # na senha, use aspas duplas
DB_NAME=tickets_db

PORT=3001
CORS_ORIGIN=*                # como front e API estão na mesma origem, * é seguro

JWT_SECRET=string-aleatoria-de-pelo-menos-32-caracteres
JWT_EXPIRES_IN=8h
```

> **JWT_SECRET**: gerar um valor único. Sugestão Linux: `openssl rand -hex 32`. Windows: usar qualquer gerador online ou digitar 40+ caracteres aleatórios.

### 3) (Opcional) Ajustar porta no `docker-compose.yml`

Se a porta 3001 estiver ocupada no servidor, edite o lado esquerdo do mapeamento:

```yaml
ports:
  - "8080:3001"   # exemplo: API acessível em http://servidor:8080
```

### 4) Subir o container

```bash
docker compose up -d --build
```

Tempo estimado: 3-5 minutos no primeiro build.

### 5) Verificar

```bash
# Status do container (deve aparecer "Up" e "healthy")
docker compose ps

# Logs em tempo real (Ctrl+C para sair, NÃO derruba o container)
docker compose logs -f

# Healthcheck da API
curl http://localhost:3001/api/health
# Esperado: {"api":"ok","db":"ok","details":[{"ok":1,"now_db":"..."}]}
```

### 6) Acessar pela rede

Em qualquer navegador da rede interna:

```
http://IP-DO-SERVIDOR:3001
```

Tela de login aparece. Usuário admin inicial já existe no banco: `carlos.valois`.

---

## Comandos do dia a dia

```bash
# Ver logs
docker compose logs -f

# Reiniciar (depois de mexer no .env)
docker compose restart

# Parar
docker compose down

# Atualizar para nova versão (depois de receber novo ZIP / git pull)
docker compose up -d --build

# Entrar dentro do container para debug
docker compose exec app sh
```

---

## Banco de dados — migrações

As tabelas do app (`chamados`, `usuarios`, `auditoria`) **já existem** no `tickets_db`. Não é necessário rodar nada.

Se for um banco novo, executar (na ordem):

1. `server/sql/001_init.sql` — cria tabela `usuarios`
2. `server/sql/002_chamados_owner.sql` — adiciona coluna de dono em `chamados`
3. `server/sql/003_auditoria.sql` — cria tabela `auditoria`

Para criar o usuário admin inicial num banco novo, rodar dentro do container:

```bash
docker compose exec app npm run create-user
```

---

## Troubleshooting

**Container não sobe / `docker compose ps` mostra "Exited"**

Olhar logs:
```bash
docker compose logs --tail 100
```

Erros comuns:
- `ECONNREFUSED 10.0.20.200:3340` → servidor não alcança o MySQL. Verificar firewall/roteamento.
- `Access denied for user 'gestao_api'` → senha errada no `.env`. Conferir.
- `JWT_SECRET não configurado` → variável faltando no `.env`.

**Página carrega mas login dá "Não foi possível conectar à API"**

- Confirmar que o servidor expôs a porta no firewall pra rede interna.
- Conferir se a porta no `docker-compose.yml` bate com a que TI espera.

**Atualizar dependências de segurança (futuro)**

A imagem é reconstruída no `--build`. Dependências do `package.json` são reinstaladas na próxima build, pegando patches do npm.

---

## Contato técnico

- Código-fonte: https://github.com/MagnusBras/gestao-chamados
- Responsável do app: Carlos Magno Brasil Valois
