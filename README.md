# Soroban License

A blockchain-based software and digital licensing protocol built on Soroban smart contracts (Stellar).

## Overview

Soroban License transforms software licensing from static legal documents into programmable, verifiable, and transferable digital rights on-chain. Developers, creators, and organizations can issue, manage, and verify licenses for software, APIs, and digital content.

## Features

- **On-Chain License Issuance** — Create unique digital licenses as blockchain assets
- **Software Licensing Module** — Activation, validation, revocation, and renewal
- **API Access Licensing** — API keys tied to on-chain licenses with rate limiting
- **Course & Content Licensing** — Tokenized access to educational and digital content
- **License Verification System** — Instant on-chain validation with public endpoints
- **Developer Integration Layer** — SDKs, REST APIs, and webhooks

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React / Next.js |
| Backend | Node.js / Rust microservices |
| Database | PostgreSQL / Redis |
| Blockchain | Soroban smart contracts (Stellar) |
| API | REST + GraphQL |
| Infrastructure | AWS / GCP / Azure |

## Project Structure

```
soroban-license/
├── contracts/          # Soroban smart contracts (Rust)
├── backend/            # Node.js API server
├── frontend/           # Next.js developer dashboard
├── sdk/                # JavaScript/TypeScript SDK
├── indexer/            # Event-driven license state tracker
└── docs/               # Documentation
```

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli)
- Node.js >= 18
- Docker & Docker Compose
- PostgreSQL 15+

### Installation

```bash
# Clone the repository
git clone https://github.com/thaiwoz02/Soroban-License.git
cd Soroban-License

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Install SDK dependencies
cd ../sdk && npm install

# Build smart contracts
cd ../contracts && cargo build --target wasm32-unknown-unknown --release
```

### Environment Setup

Copy the example env files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Running Locally

```bash
# Start infrastructure (PostgreSQL, Redis)
docker-compose up -d

# Run database migrations
cd backend && npm run migrate

# Start backend API
cd backend && npm run dev

# Start frontend dashboard
cd frontend && npm run dev

# Start indexer
cd indexer && npm run dev
```

## Smart Contracts

See [contracts/README.md](contracts/README.md) for contract documentation.

## API Documentation

See [docs/api.md](docs/api.md) for REST API reference.

## SDK Usage

```typescript
import { SorobanLicense } from '@soroban-license/sdk';

const client = new SorobanLicense({
  network: 'testnet',
  apiKey: 'your-api-key',
});

// Verify a license
const result = await client.licenses.verify('LICENSE_ID');
console.log(result.valid); // true
```

## Implementation Phases

- **Phase 1** — Core Licensing System (on-chain creation, validation, developer API)
- **Phase 2** — Access Control Layer (API licensing, software activation, subscriptions)
- **Phase 3** — Developer Ecosystem (SDK, dashboard, analytics)
- **Phase 4** — Marketplace & Expansion (transfer, resale, enterprise)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.

## License

Apache 2.0 — see [LICENSE](LICENSE)
