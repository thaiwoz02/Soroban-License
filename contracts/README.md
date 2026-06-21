# Soroban License — Smart Contracts

## Contracts

| Contract | Description |
|---|---|
| `license-core` | Core license issuance, activation, revocation, renewal, transfer |
| `license-registry` | Global product and developer registry |
| `api-license` | API key management tied to on-chain licenses |
| `content-license` | Digital course and content license management |

## Building

```bash
cd contracts

# Build all contracts
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test
```

## Deploying to Testnet

```bash
# Install Stellar CLI
cargo install --locked stellar-cli --features opt

# Configure testnet
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate a keypair
stellar keys generate deployer --network testnet --fund

# Deploy license-core
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/license_core.wasm \
  --source deployer \
  --network testnet

# Initialize
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS>
```

## Architecture

```
license-registry  (product discovery)
       │
       └── license-core  (core license lifecycle)
                │
                ├── api-license     (API key enforcement)
                └── content-license (digital content access)
```

## License Data Model

```
License {
  id:               BytesN<32>      # Unique on-chain ID
  issuer:           Address         # Developer / creator
  holder:           Address         # End user / org
  product_id:       String          # Product identifier
  license_type:     Enum            # Perpetual | Subscription | Metered | Tiered
  status:           Enum            # Active | Expired | Revoked | Suspended
  access_level:     Enum            # Basic | Standard | Pro | Enterprise
  issued_at:        u64             # Unix timestamp
  expires_at:       u64             # 0 = no expiry
  max_activations:  u32             # 0 = unlimited
  activation_count: u32
  transferable:     bool
  metadata:         Map<String,String>
}
```
