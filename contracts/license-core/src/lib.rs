//! Soroban License — Core Contract
//!
//! This contract handles the issuance, management, and verification of
//! on-chain digital licenses. It is the root contract that coordinates
//! all licensing operations.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Bytes, BytesN, Env, Map, String, Symbol, Vec,
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const ADMIN: Symbol = symbol_short!("ADMIN");
const LICENSE_COUNT: Symbol = symbol_short!("LC");

// ─── Data Types ───────────────────────────────────────────────────────────────

/// License type classification
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum LicenseType {
    /// One-time perpetual license
    Perpetual,
    /// Subscription-based (requires renewal)
    Subscription,
    /// Pay-per-use metered license
    Metered,
    /// Tiered access (Basic / Pro / Enterprise)
    Tiered,
}

/// Current state of a license
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum LicenseStatus {
    Active,
    Expired,
    Revoked,
    Suspended,
    PendingActivation,
}

/// Access level granted by a license
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum AccessLevel {
    Basic,
    Standard,
    Pro,
    Enterprise,
}

/// Core license data stored on-chain
#[contracttype]
#[derive(Clone, Debug)]
pub struct License {
    /// Unique license identifier (32-byte hash)
    pub id: BytesN<32>,
    /// Address of the license issuer (software developer / creator)
    pub issuer: Address,
    /// Address of the license holder (end user / organization)
    pub holder: Address,
    /// Product or software identifier
    pub product_id: String,
    /// License type
    pub license_type: LicenseType,
    /// Current status
    pub status: LicenseStatus,
    /// Access level granted
    pub access_level: AccessLevel,
    /// Timestamp when license was issued (Unix seconds)
    pub issued_at: u64,
    /// Timestamp when license expires (0 = perpetual)
    pub expires_at: u64,
    /// Max number of activations allowed (0 = unlimited)
    pub max_activations: u32,
    /// Current activation count
    pub activation_count: u32,
    /// Whether this license can be transferred
    pub transferable: bool,
    /// Additional metadata (key-value)
    pub metadata: Map<String, String>,
}

/// License storage key
#[contracttype]
pub enum DataKey {
    License(BytesN<32>),
    IssuerLicenses(Address),
    HolderLicenses(Address),
    ProductLicenses(String),
}

// ─── Events ───────────────────────────────────────────────────────────────────

fn emit_license_issued(env: &Env, id: &BytesN<32>, issuer: &Address, holder: &Address) {
    env.events().publish(
        (symbol_short!("issued"), issuer.clone()),
        (id.clone(), holder.clone()),
    );
}

fn emit_license_revoked(env: &Env, id: &BytesN<32>) {
    env.events().publish(
        (symbol_short!("revoked"),),
        id.clone(),
    );
}

fn emit_license_renewed(env: &Env, id: &BytesN<32>, new_expiry: u64) {
    env.events().publish(
        (symbol_short!("renewed"),),
        (id.clone(), new_expiry),
    );
}

fn emit_license_transferred(env: &Env, id: &BytesN<32>, from: &Address, to: &Address) {
    env.events().publish(
        (symbol_short!("transfer"), from.clone()),
        (id.clone(), to.clone()),
    );
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct LicenseCoreContract;

#[contractimpl]
impl LicenseCoreContract {
    // ── Initialization ──────────────────────────────────────────────────────

    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&LICENSE_COUNT, &0u64);
    }

    // ── License Issuance ────────────────────────────────────────────────────

    /// Issue a new license.
    ///
    /// Only the `issuer` themselves may call this. The license ID is derived
    /// deterministically from the issuer, holder, product, and current ledger.
    pub fn issue_license(
        env: Env,
        issuer: Address,
        holder: Address,
        product_id: String,
        license_type: LicenseType,
        access_level: AccessLevel,
        expires_at: u64,
        max_activations: u32,
        transferable: bool,
        metadata: Map<String, String>,
    ) -> BytesN<32> {
        issuer.require_auth();

        let now = env.ledger().timestamp();

        // Derive a unique license ID
        let mut id_preimage = Bytes::new(&env);
        id_preimage.append(&issuer.clone().to_xdr(&env));
        id_preimage.append(&holder.clone().to_xdr(&env));
        id_preimage.append(&product_id.clone().to_xdr(&env));
        let counter: u64 = env.storage().instance().get(&LICENSE_COUNT).unwrap_or(0);
        id_preimage.extend_from_array(&counter.to_be_bytes());
        let id: BytesN<32> = env.crypto().sha256(&id_preimage).into();

        let license = License {
            id: id.clone(),
            issuer: issuer.clone(),
            holder: holder.clone(),
            product_id: product_id.clone(),
            license_type,
            status: LicenseStatus::Active,
            access_level,
            issued_at: now,
            expires_at,
            max_activations,
            activation_count: 0,
            transferable,
            metadata,
        };

        // Persist license
        env.storage()
            .persistent()
            .set(&DataKey::License(id.clone()), &license);

        // Update issuer index
        let mut issuer_list: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::IssuerLicenses(issuer.clone()))
            .unwrap_or(Vec::new(&env));
        issuer_list.push_back(id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::IssuerLicenses(issuer.clone()), &issuer_list);

        // Update holder index
        let mut holder_list: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::HolderLicenses(holder.clone()))
            .unwrap_or(Vec::new(&env));
        holder_list.push_back(id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::HolderLicenses(holder.clone()), &holder_list);

        // Update product index
        let mut product_list: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::ProductLicenses(product_id.clone()))
            .unwrap_or(Vec::new(&env));
        product_list.push_back(id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::ProductLicenses(product_id), &product_list);

        // Increment global counter
        env.storage()
            .instance()
            .set(&LICENSE_COUNT, &(counter + 1));

        emit_license_issued(&env, &id, &issuer, &holder);

        id
    }

    // ── License Verification ────────────────────────────────────────────────

    /// Verify whether a license is currently valid.
    ///
    /// Returns `true` if the license exists, is Active, and has not expired.
    pub fn verify_license(env: Env, id: BytesN<32>) -> bool {
        let license: Option<License> = env
            .storage()
            .persistent()
            .get(&DataKey::License(id));

        match license {
            None => false,
            Some(l) => {
                if l.status != LicenseStatus::Active {
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

    /// Get full license data.
    pub fn get_license(env: Env, id: BytesN<32>) -> Option<License> {
        env.storage()
            .persistent()
            .get(&DataKey::License(id))
    }

    // ── Activation ──────────────────────────────────────────────────────────

    /// Activate a license (e.g., bind to a device or user session).
    pub fn activate_license(env: Env, holder: Address, id: BytesN<32>) {
        holder.require_auth();

        let mut license: License = env
            .storage()
            .persistent()
            .get(&DataKey::License(id.clone()))
            .expect("license not found");

        assert!(license.holder == holder, "not the license holder");
        assert!(
            license.status == LicenseStatus::Active
                || license.status == LicenseStatus::PendingActivation,
            "license not activatable"
        );

        if license.max_activations > 0 {
            assert!(
                license.activation_count < license.max_activations,
                "max activations reached"
            );
        }

        license.activation_count += 1;
        license.status = LicenseStatus::Active;

        env.storage()
            .persistent()
            .set(&DataKey::License(id), &license);
    }

    // ── Revocation ──────────────────────────────────────────────────────────

    /// Revoke a license. Only the issuer may revoke.
    pub fn revoke_license(env: Env, issuer: Address, id: BytesN<32>) {
        issuer.require_auth();

        let mut license: License = env
            .storage()
            .persistent()
            .get(&DataKey::License(id.clone()))
            .expect("license not found");

        assert!(license.issuer == issuer, "not the issuer");
        license.status = LicenseStatus::Revoked;

        env.storage()
            .persistent()
            .set(&DataKey::License(id.clone()), &license);

        emit_license_revoked(&env, &id);
    }

    // ── Renewal ─────────────────────────────────────────────────────────────

    /// Renew a subscription license, extending its expiry.
    pub fn renew_license(env: Env, issuer: Address, id: BytesN<32>, new_expires_at: u64) {
        issuer.require_auth();

        let mut license: License = env
            .storage()
            .persistent()
            .get(&DataKey::License(id.clone()))
            .expect("license not found");

        assert!(license.issuer == issuer, "not the issuer");
        assert!(
            license.license_type == LicenseType::Subscription,
            "only subscription licenses can be renewed"
        );

        let now = env.ledger().timestamp();
        assert!(new_expires_at > now, "new expiry must be in the future");

        license.expires_at = new_expires_at;
        license.status = LicenseStatus::Active;

        env.storage()
            .persistent()
            .set(&DataKey::License(id.clone()), &license);

        emit_license_renewed(&env, &id, new_expires_at);
    }

    // ── Transfer ────────────────────────────────────────────────────────────

    /// Transfer a license to a new holder.
    /// Only the current holder may transfer, and only if `transferable == true`.
    pub fn transfer_license(env: Env, holder: Address, id: BytesN<32>, new_holder: Address) {
        holder.require_auth();

        let mut license: License = env
            .storage()
            .persistent()
            .get(&DataKey::License(id.clone()))
            .expect("license not found");

        assert!(license.holder == holder, "not the license holder");
        assert!(license.transferable, "license is not transferable");
        assert!(
            license.status == LicenseStatus::Active,
            "only active licenses can be transferred"
        );

        let old_holder = license.holder.clone();
        license.holder = new_holder.clone();

        env.storage()
            .persistent()
            .set(&DataKey::License(id.clone()), &license);

        emit_license_transferred(&env, &id, &old_holder, &new_holder);
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    /// List all license IDs issued by a given address.
    pub fn get_issuer_licenses(env: Env, issuer: Address) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::IssuerLicenses(issuer))
            .unwrap_or(Vec::new(&env))
    }

    /// List all license IDs held by a given address.
    pub fn get_holder_licenses(env: Env, holder: Address) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::HolderLicenses(holder))
            .unwrap_or(Vec::new(&env))
    }

    /// Total number of licenses issued through this contract.
    pub fn total_licenses(env: Env) -> u64 {
        env.storage().instance().get(&LICENSE_COUNT).unwrap_or(0)
    }

    /// Get the admin address.
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).expect("not initialized")
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, Map, String};

    #[test]
    fn test_issue_and_verify() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, LicenseCoreContract);
        let client = LicenseCoreContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let issuer = Address::generate(&env);
        let holder = Address::generate(&env);

        client.initialize(&admin);

        let product_id = String::from_str(&env, "product-001");
        let metadata = Map::new(&env);

        let id = client.issue_license(
            &issuer,
            &holder,
            &product_id,
            &LicenseType::Perpetual,
            &AccessLevel::Standard,
            &0u64,   // no expiry
            &0u32,   // unlimited activations
            &false,
            &metadata,
        );

        assert!(client.verify_license(&id));
        assert_eq!(client.total_licenses(), 1);
    }

    #[test]
    fn test_revoke_license() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, LicenseCoreContract);
        let client = LicenseCoreContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let issuer = Address::generate(&env);
        let holder = Address::generate(&env);

        client.initialize(&admin);

        let id = client.issue_license(
            &issuer,
            &holder,
            &String::from_str(&env, "product-001"),
            &LicenseType::Perpetual,
            &AccessLevel::Basic,
            &0u64,
            &0u32,
            &false,
            &Map::new(&env),
        );

        assert!(client.verify_license(&id));
        client.revoke_license(&issuer, &id);
        assert!(!client.verify_license(&id));
    }
}
