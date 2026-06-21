# Smart Contract Reference

## license-core

The root contract managing the full license lifecycle.

### Functions

| Function | Auth | Description |
|---|---|---|
| `initialize(admin)` | — | One-time setup |
| `issue_license(issuer, holder, product_id, ...)` | issuer | Create a new license |
| `verify_license(id)` | — | Returns bool — safe to call publicly |
| `get_license(id)` | — | Returns full License struct |
| `activate_license(holder, id)` | holder | Bind license to a session/device |
| `revoke_license(issuer, id)` | issuer | Mark license as revoked |
| `renew_license(issuer, id, new_expires_at)` | issuer | Extend subscription |
| `transfer_license(holder, id, new_holder)` | holder | Transfer to new holder |
| `get_issuer_licenses(issuer)` | — | List by issuer |
| `get_holder_licenses(holder)` | — | List by holder |
| `total_licenses()` | — | Global count |

### Events

| Topic | Data | Trigger |
|---|---|---|
| `issued` | `(license_id, holder)` | New license issued |
| `revoked` | `license_id` | License revoked |
| `renewed` | `(license_id, new_expiry)` | Subscription renewed |
| `transfer` | `(license_id, new_holder)` | License transferred |

---

## license-registry

Product and developer registration layer.

| Function | Auth | Description |
|---|---|---|
| `register_product(owner, product_id, name, desc, contract)` | owner | Register a product |
| `deactivate_product(owner, product_id)` | owner | Remove from registry |
| `get_product(product_id)` | — | Fetch product entry |
| `get_owner_products(owner)` | — | List owner's products |

---

## api-license

API key management tied to on-chain licenses.

| Function | Auth | Description |
|---|---|---|
| `issue_api_key(owner, raw_key, license_id, ...)` | owner | Issue API key (stored as hash) |
| `validate_api_key(key_hash)` | — | Validate key — returns entry if valid |
| `record_usage(key_hash)` | — | Increment usage counter |
| `revoke_api_key(owner, key_hash)` | owner | Deactivate key |
| `get_api_key(key_hash)` | — | Fetch key entry |

---

## content-license

Tokenized educational and digital content access.

| Function | Auth | Description |
|---|---|---|
| `issue_content_license(issuer, holder, content_id, ...)` | issuer | Grant content access |
| `verify_access(holder, id)` | — | Check if holder can access |
| `consume_license(holder, id)` | holder | Mark single-use license consumed |
| `transfer_content_license(holder, id, new_holder)` | holder | Transfer (if transferable) |
| `revoke_content_license(issuer, id)` | issuer | Revoke access |
| `get_content_license(id)` | — | Fetch license data |
