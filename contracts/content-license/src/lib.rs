//! Content License Contract
//!
//! Tokenized access to educational content, digital courses, and other
//! digital goods. Supports time-based, lifetime, and transferable access.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, BytesN, Env, String, Symbol,
};

const ADMIN: Symbol = symbol_short!("ADMIN");

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ContentAccessType {
    /// Access forever
    Lifetime,
    /// Access until `expires_at`
    TimeBased,
    /// Pay-per-view / single use
    SingleUse,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ContentLicenseStatus {
    Active,
    Expired,
    Consumed,
    Revoked,
}

#[contracttype]
#[derive(Clone)]
pub struct ContentLicense {
    pub id: BytesN<32>,
    pub issuer: Address,
    pub holder: Address,
    /// Unique content/course identifier
    pub content_id: String,
    pub access_type: ContentAccessType,
    pub status: ContentLicenseStatus,
    pub issued_at: u64,
    /// 0 = lifetime
    pub expires_at: u64,
    /// Whether ownership can be transferred to another user
    pub transferable: bool,
    /// For single-use: has content been accessed
    pub consumed: bool,
}

#[contracttype]
pub enum DataKey {
    ContentLicense(BytesN<32>),
    HolderContent(Address),
    ContentHolders(String),
}

#[contract]
pub struct ContentLicenseContract;

#[contractimpl]
impl ContentLicenseContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    /// Issue a content license.
    pub fn issue_content_license(
        env: Env,
        issuer: Address,
        holder: Address,
        content_id: String,
        access_type: ContentAccessType,
        expires_at: u64,
        transferable: bool,
    ) -> BytesN<32> {
        issuer.require_auth();

        let now = env.ledger().timestamp();
        let counter: u64 = env
            .storage()
            .instance()
            .get(&symbol_short!("CC"))
            .unwrap_or(0u64);

        let mut preimage = soroban_sdk::Bytes::new(&env);
        preimage.append(&issuer.clone().to_xdr(&env));
        preimage.append(&holder.clone().to_xdr(&env));
        preimage.append(&content_id.clone().to_xdr(&env));
        preimage.extend_from_array(&counter.to_be_bytes());
        let id: BytesN<32> = env.crypto().sha256(&preimage).into();

        let license = ContentLicense {
            id: id.clone(),
            issuer,
            holder: holder.clone(),
            content_id: content_id.clone(),
            access_type,
            status: ContentLicenseStatus::Active,
            issued_at: now,
            expires_at,
            transferable,
            consumed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::ContentLicense(id.clone()), &license);

        env.storage()
            .instance()
            .set(&symbol_short!("CC"), &(counter + 1));

        env.events().publish(
            (symbol_short!("ct_issue"),),
            (id.clone(), holder, content_id),
        );

        id
    }

    /// Verify access to a piece of content.
    pub fn verify_access(env: Env, holder: Address, id: BytesN<32>) -> bool {
        let license: Option<ContentLicense> = env
            .storage()
            .persistent()
            .get(&DataKey::ContentLicense(id));

        match license {
            None => false,
            Some(l) => {
                if l.holder != holder {
                    return false;
                }
                if l.status != ContentLicenseStatus::Active {
                    return false;
                }
                if l.consumed {
                    return false;
                }
                let now = env.ledger().timestamp();
                if l.expires_at > 0 && now > l.expires_at {
                    return false;
                }
                true
            }
        }
    }

    /// Consume a single-use content license.
    pub fn consume_license(env: Env, holder: Address, id: BytesN<32>) {
        holder.require_auth();

        let mut license: ContentLicense = env
            .storage()
            .persistent()
            .get(&DataKey::ContentLicense(id.clone()))
            .expect("license not found");

        assert!(license.holder == holder, "not the license holder");
        assert!(
            license.access_type == ContentAccessType::SingleUse,
            "only single-use licenses can be consumed"
        );
        assert!(!license.consumed, "already consumed");

        license.consumed = true;
        license.status = ContentLicenseStatus::Consumed;

        env.storage()
            .persistent()
            .set(&DataKey::ContentLicense(id), &license);
    }

    /// Transfer a content license to a new holder.
    pub fn transfer_content_license(
        env: Env,
        holder: Address,
        id: BytesN<32>,
        new_holder: Address,
    ) {
        holder.require_auth();

        let mut license: ContentLicense = env
            .storage()
            .persistent()
            .get(&DataKey::ContentLicense(id.clone()))
            .expect("license not found");

        assert!(license.holder == holder, "not the license holder");
        assert!(license.transferable, "license not transferable");
        assert!(
            license.status == ContentLicenseStatus::Active,
            "license not active"
        );

        license.holder = new_holder.clone();

        env.storage()
            .persistent()
            .set(&DataKey::ContentLicense(id.clone()), &license);

        env.events().publish(
            (symbol_short!("ct_xfer"), holder),
            (id, new_holder),
        );
    }

    /// Get content license data.
    pub fn get_content_license(env: Env, id: BytesN<32>) -> Option<ContentLicense> {
        env.storage()
            .persistent()
            .get(&DataKey::ContentLicense(id))
    }

    /// Revoke a content license. Only issuer may revoke.
    pub fn revoke_content_license(env: Env, issuer: Address, id: BytesN<32>) {
        issuer.require_auth();

        let mut license: ContentLicense = env
            .storage()
            .persistent()
            .get(&DataKey::ContentLicense(id.clone()))
            .expect("license not found");

        assert!(license.issuer == issuer, "not the issuer");
        license.status = ContentLicenseStatus::Revoked;

        env.storage()
            .persistent()
            .set(&DataKey::ContentLicense(id), &license);
    }
}
