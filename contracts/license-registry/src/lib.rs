//! License Registry Contract
//!
//! Maintains a global registry of products and their associated license
//! contract addresses. Acts as a discovery layer for the ecosystem.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, BytesN, Env, String, Symbol, Vec,
};

const ADMIN: Symbol = symbol_short!("ADMIN");

#[contracttype]
pub struct ProductEntry {
    /// Product identifier
    pub product_id: String,
    /// Developer / issuer address
    pub owner: Address,
    /// Address of the deployed license-core contract for this product
    pub license_contract: Address,
    /// Human-readable product name
    pub name: String,
    /// Product description
    pub description: String,
    /// Registration timestamp
    pub registered_at: u64,
    /// Is the product still active on the registry
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Product(String),
    OwnerProducts(Address),
}

#[contract]
pub struct LicenseRegistryContract;

#[contractimpl]
impl LicenseRegistryContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    /// Register a product and its associated license contract.
    pub fn register_product(
        env: Env,
        owner: Address,
        product_id: String,
        name: String,
        description: String,
        license_contract: Address,
    ) {
        owner.require_auth();

        assert!(
            !env.storage()
                .persistent()
                .has(&DataKey::Product(product_id.clone())),
            "product already registered"
        );

        let entry = ProductEntry {
            product_id: product_id.clone(),
            owner: owner.clone(),
            license_contract,
            name,
            description,
            registered_at: env.ledger().timestamp(),
            active: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &entry);

        let mut list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerProducts(owner.clone()))
            .unwrap_or(Vec::new(&env));
        list.push_back(product_id);
        env.storage()
            .persistent()
            .set(&DataKey::OwnerProducts(owner), &list);
    }

    /// Deactivate a product from the registry.
    pub fn deactivate_product(env: Env, owner: Address, product_id: String) {
        owner.require_auth();

        let mut entry: ProductEntry = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .expect("product not found");

        assert!(entry.owner == owner, "not the product owner");
        entry.active = false;

        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id), &entry);
    }

    /// Look up a product entry.
    pub fn get_product(env: Env, product_id: String) -> Option<ProductEntry> {
        env.storage()
            .persistent()
            .get(&DataKey::Product(product_id))
    }

    /// List all product IDs registered by an owner.
    pub fn get_owner_products(env: Env, owner: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::OwnerProducts(owner))
            .unwrap_or(Vec::new(&env))
    }
}
