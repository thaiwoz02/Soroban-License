# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Stellar CLI (`cargo install stellar-cli --features opt`)
- A funded Stellar testnet/mainnet keypair
- PostgreSQL 15+ and Redis 7+ (or use the provided docker-compose)

---

## 1. Clone & Configure

```bash
git clone https://github.com/thaiwoz02/Soroban-License.git
cd Soroban-License
cp .env.example .env
# Edit .env — set JWT_SECRET, STELLAR_ADMIN_SECRET, network config
```

---

## 2. Deploy Smart Contracts

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release

# Add testnet network
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate and fund a deployer key
stellar keys generate deployer --network testnet --fund

# Deploy each contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/license_core.wasm \
  --source deployer --network testnet
# → Copy CONTRACT_ID to .env as LICENSE_CORE_CONTRACT_ID

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/license_registry.wasm \
  --source deployer --network testnet
# → Copy to LICENSE_REGISTRY_CONTRACT_ID

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/api_license.wasm \
  --source deployer --network testnet
# → Copy to API_LICENSE_CONTRACT_ID

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/content_license.wasm \
  --source deployer --network testnet
# → Copy to CONTENT_LICENSE_CONTRACT_ID

# Initialize license-core
stellar contract invoke \
  --id $LICENSE_CORE_CONTRACT_ID \
  --source deployer --network testnet \
  -- initialize --admin $(stellar keys address deployer)
```

---

## 3. Start Infrastructure

```bash
# Start Postgres + Redis
docker-compose up -d postgres redis

# Run DB migrations
cd backend
npm install
npm run migrate
```

---

## 4. Start Services

```bash
# Option A — Docker Compose (all services)
docker-compose up -d

# Option B — Local dev
cd backend  && npm run dev   # :3001
cd frontend && npm run dev   # :3000
cd indexer  && npm run dev   # background
```

---

## 5. Verify Deployment

```bash
curl http://localhost:3001/health
# {"status":"ok","version":"0.1.0"}

curl http://localhost:3001/api/v1/verify/any-id
# {"valid":false,"reason":"License not found"}
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | Min 32-char random secret for JWT signing |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `STELLAR_NETWORK` | ✅ | `testnet` or `mainnet` |
| `STELLAR_RPC_URL` | ✅ | Soroban RPC endpoint |
| `STELLAR_ADMIN_SECRET` | ✅ | Admin keypair secret (for contract calls) |
| `LICENSE_CORE_CONTRACT_ID` | ✅ | Deployed license-core contract address |
| `API_LICENSE_CONTRACT_ID` | ✅ | Deployed api-license contract address |
| `CONTENT_LICENSE_CONTRACT_ID` | ✅ | Deployed content-license contract address |
| `CORS_ORIGIN` | — | Allowed frontend origin (default: localhost:3000) |

---

## Production Checklist

- [ ] Rotate `JWT_SECRET` to a cryptographically random value
- [ ] Use managed PostgreSQL (RDS, Cloud SQL) — not Docker in prod
- [ ] Enable TLS on all endpoints (reverse proxy: nginx / Caddy)
- [ ] Set `NODE_ENV=production` — disables error detail leakage
- [ ] Configure log shipping (CloudWatch, Datadog, etc.)
- [ ] Set up contract event indexer with persistent Redis
- [ ] Monitor RPC node availability with a fallback endpoint
