# @soroban-license/sdk

TypeScript SDK for the Soroban License protocol.

## Installation

```bash
npm install @soroban-license/sdk
```

## Quick Start

```typescript
import { SorobanLicense } from '@soroban-license/sdk';

const client = new SorobanLicense({
  network: 'testnet',
  apiKey: 'your-jwt-token',
});

// Verify a license (no auth needed)
const result = await client.verify.verify('LICENSE_ID');
if (result.valid) {
  console.log('Access granted:', result.license?.accessLevel);
}

// Issue a license
const license = await client.licenses.issue({
  holderAddress: 'GABC...',
  productId: 'prod-uuid',
  licenseType: 'subscription',
  accessLevel: 'pro',
  expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30 days
  transferable: false,
});

// Issue an API key
const { rawKey } = await client.apiKeys.issue({
  licenseId: license.id,
  apiId: 'my-api',
  rpmLimit: 100,
});
console.log('Save this key:', rawKey); // shown only once

// Validate an API key (use in your middleware)
const validation = await client.apiKeys.validate(rawKey);
if (!validation.valid) throw new Error('Unauthorized');
```

## Express Middleware Example

```typescript
import { SorobanLicense } from '@soroban-license/sdk';

const licenseClient = new SorobanLicense({ network: 'mainnet' });

export async function licenseMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'API key required' });

  const result = await licenseClient.apiKeys.validate(key);
  if (!result.valid) return res.status(403).json({ error: result.reason });

  req.rateLimit = result.rateLimit;
  next();
}
```

## API Reference

### `client.verify`
- `verify(licenseId)` — verify a license by ID
- `batch(licenseIds[])` — verify up to 50 licenses at once

### `client.licenses`
- `list({ role, page, limit })` — list your licenses
- `get(id)` — get a single license
- `issue(params)` — issue a new license
- `revoke(id)` — revoke a license
- `renew(id, newExpiresAt)` — renew a subscription
- `transfer(id, newHolderAddress)` — transfer to new holder

### `client.apiKeys`
- `list()` — list your API keys
- `issue(params)` — create a new API key
- `revoke(id)` — revoke an API key
- `validate(rawKey)` — validate a raw key (use in middleware)

### `client.content`
- `issue(params)` — issue a content license
- `verifyAccess(contentId, holderAddress)` — check content access
