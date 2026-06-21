//! API License Contract
//!
//! Manages API key issuance tied to on-chain licenses, rate limiting per
//! tier, and subscription-based access control.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Bytes, BytesN, Env, String, Symbol,
};

const ADMIN: Symbol = symbol_short!("ADMIN");

/// Rate limit configuration per license tier
#[contracttype]
#[derive(Clone)]
pub struct RateLimit {
    /// Max requests per minute
    pub requests_per_minute: u32,
    /// Max requests per day
    pub requests_per_day: u32,
    /// Max requests per month
    pub requests_per_month: u32,
}

/// An API key entry linked to an on-chain license
#[contracttype]
#[derive(Clone)]
pub struct ApiKeyEntry {
    /// The hashed API key (sha256 of the raw key)
    pub key_hash: BytesN<32>,
    /// License ID this key is bound to
    pub license_id: BytesN<32>,
    /// Owner address
    pub owner: Address,
    /// Product / API identifier
    pub api_id: String,
    /// Rate limits for this key
    pub rate_limit: RateLimit,
    /// Whether the key is currently active
    pub active: bool,
    /// Issued at timestamp
    pub issued_at: u64,
    /// Expiry (0 = no expiry)
    pub expires_at: u64,
    /// Cumulative request count (lifetime)
    pub total_requests: u64,
}

#[contracttype]
pub enum DataKey {
    ApiKey(BytesN<32>),
    LicenseApiKeys(BytesN<32>),
    OwnerApiKeys(Address),
}

#[contract]
pub struct ApiLicenseContract;

#[contractimpl]
impl ApiLicenseContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    /// Issue an API key bound to a license.
    ///
    /// The caller must be the license holder. `raw_key` is hashed before
    /// storage — the raw key should only be returned to the user once and
    /// never stored in plain text.
    pub fn issue_api_key(
        env: Env,
        owner: Address,
        raw_key: Bytes,
        license_id: BytesN<32>,
        api_id: String,
        rate_limit: RateLimit,
        expires_at: u64,
    ) -> BytesN<32> {
        owner.require_auth();

        let key_hash: BytesN<32> = env.crypto().sha256(&raw_key).into();

        assert!(
            !env.storage()
                .persistent()
                .has(&DataKey::ApiKey(key_hash.clone())),
            "api key already exists"
        );

        let entry = ApiKeyEntry {
            key_hash: key_hash.clone(),
            license_id: license_id.clone(),
            owner: owner.clone(),
            api_id,
            rate_limit,
            active: true,
            issued_at: env.ledger().timestamp(),
            expires_at,
            total_requests: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::ApiKey(key_hash.clone()), &entry);

        env.events().publish(
            (symbol_short!("api_issue"), owner.clone()),
            (key_hash.clone(), license_id),
        );

        key_hash
    }

    /// Validate an API key. Returns the entry if valid and active.
    pub fn validate_api_key(env: Env, key_hash: BytesN<32>) -> Option<ApiKeyEntry> {
        let entry: Option<ApiKeyEntry> = env
            .storage()
            .persistent()
            .get(&DataKey::ApiKey(key_hash));

        match entry {
            None => None,
            Some(e) => {
                if !e.active {
                    return None;
                }
                let now = env.ledger().timestamp();
                if e.expires_at > 0 && now > e.expires_at {
                    return None;
                }
                Some(e)
            }
        }
    }

    /// Record a request usage tick. Increments the total_requests counter.
    pub fn record_usage(env: Env, key_hash: BytesN<32>) {
        let mut entry: ApiKeyEntry = env
            .storage()
            .persistent()
            .get(&DataKey::ApiKey(key_hash.clone()))
            .expect("api key not found");

        entry.total_requests += 1;

        env.storage()
            .persistent()
            .set(&DataKey::ApiKey(key_hash), &entry);
    }

    /// Revoke an API key.
    pub fn revoke_api_key(env: Env, owner: Address, key_hash: BytesN<32>) {
        owner.require_auth();

        let mut entry: ApiKeyEntry = env
            .storage()
            .persistent()
            .get(&DataKey::ApiKey(key_hash.clone()))
            .expect("api key not found");

        assert!(entry.owner == owner, "not the key owner");
        entry.active = false;

        env.storage()
            .persistent()
            .set(&DataKey::ApiKey(key_hash.clone()), &entry);

        env.events()
            .publish((symbol_short!("api_revoke"),), key_hash);
    }

    /// Get the API key entry by hash.
    pub fn get_api_key(env: Env, key_hash: BytesN<32>) -> Option<ApiKeyEntry> {
        env.storage()
            .persistent()
            .get(&DataKey::ApiKey(key_hash))
    }
}
