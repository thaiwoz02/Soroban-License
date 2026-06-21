# Soroban License REST API

Base URL: `https://api.soroban-license.io/v1` (prod) / `http://localhost:3001/api/v1` (local)

All authenticated endpoints require `Authorization: Bearer <token>`.

---

## Authentication

### `POST /auth/challenge`
Get a challenge string to sign with your Stellar wallet.

**Response**
```json
{ "challenge": "soroban-license-auth:1719000000:abc123" }
```

### `POST /auth/verify`
Submit the signed challenge to receive a JWT.

**Body**
```json
{
  "stellarAddress": "GABC...",
  "challenge": "soroban-license-auth:...",
  "signature": "<base64-encoded-signature>"
}
```

**Response**
```json
{ "token": "eyJ...", "user": { "id": "uuid", "stellarAddress": "GABC..." } }
```

---

## Licenses

### `GET /licenses`
List your licenses. Query params: `role=holder|issuer`, `page`, `limit`.

### `GET /licenses/:id`
Get a single license.

### `POST /licenses`
Issue a new license. *(auth required — caller must own the product)*

**Body**
```json
{
  "holderAddress": "GXYZ...",
  "productId": "uuid",
  "licenseType": "subscription",
  "accessLevel": "pro",
  "expiresAt": 1750000000,
  "maxActivations": 1,
  "transferable": false,
  "metadata": { "plan": "monthly" }
}
```

### `POST /licenses/:id/revoke`
Revoke a license. *(issuer only)*

### `POST /licenses/:id/renew`
Renew a subscription license.

**Body:** `{ "newExpiresAt": 1780000000 }`

### `POST /licenses/:id/transfer`
Transfer a license to a new holder. *(current holder only)*

**Body:** `{ "newHolderAddress": "GNEW..." }`

---

## Verification (public — no auth)

### `GET /verify/:licenseId`
Verify a license by UUID or on-chain hex ID.

**Response**
```json
{
  "valid": true,
  "license": {
    "id": "uuid",
    "onChainId": "abc123...",
    "status": "active",
    "licenseType": "subscription",
    "accessLevel": "pro",
    "holderAddress": "GXYZ...",
    "issuedAt": 1719000000,
    "expiresAt": 1750000000
  }
}
```

### `POST /verify/batch`
Verify up to 50 licenses in one call.

**Body:** `{ "licenseIds": ["id1", "id2"] }`

---

## Products

### `GET /products` *(auth)*
List your registered products.

### `POST /products` *(auth)*
Register a new product.

**Body**
```json
{
  "productId": "my-saas-v1",
  "name": "My SaaS Product",
  "description": "...",
  "productType": "software",
  "licenseContractAddress": "CXXX..."
}
```

### `DELETE /products/:id` *(auth)*
Deactivate a product.

---

## API Keys

### `GET /api-keys` *(auth)*
List your API keys (hash hidden, prefix shown).

### `POST /api-keys` *(auth)*
Issue a new API key. **Raw key returned once only.**

**Body**
```json
{
  "licenseId": "uuid",
  "apiId": "my-api",
  "rpmLimit": 100,
  "rpdLimit": 5000,
  "expiresAt": 0
}
```

### `DELETE /api-keys/:id` *(auth)*
Revoke an API key.

### `POST /api-keys/validate` *(public)*
Validate a raw API key for middleware use.

**Body:** `{ "apiKey": "sl_live_abc..." }`

---

## Content Licenses

### `POST /content` *(auth)*
Issue a content license.

**Body**
```json
{
  "holderAddress": "GXYZ...",
  "contentId": "course-001",
  "accessType": "lifetime",
  "expiresAt": 0,
  "transferable": false
}
```

### `GET /content/verify/:contentId?holderAddress=GXYZ`
Verify content access for a holder.

---

## Error Format

All errors return:
```json
{ "error": "Human-readable message", "details": [...] }
```

HTTP status codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate limited, `500` server error.
