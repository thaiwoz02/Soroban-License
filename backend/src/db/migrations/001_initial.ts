import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users / developers
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('stellar_address', 64).notNullable().unique();
    t.string('email', 255).unique();
    t.string('name', 255);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // Products / software registered by developers
  await knex.schema.createTable('products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('product_id', 128).notNullable().unique(); // on-chain product ID
    t.string('name', 255).notNullable();
    t.text('description');
    t.enum('product_type', ['software', 'api', 'course', 'content', 'subscription'])
      .notNullable()
      .defaultTo('software');
    t.string('license_contract_address', 64);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // Licenses — mirrors on-chain state for fast querying
  await knex.schema.createTable('licenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('on_chain_id', 128).notNullable().unique(); // hex of BytesN<32>
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('issuer_address', 64).notNullable();
    t.string('holder_address', 64).notNullable();
    t.enum('license_type', ['perpetual', 'subscription', 'metered', 'tiered'])
      .notNullable()
      .defaultTo('perpetual');
    t.enum('status', ['active', 'expired', 'revoked', 'suspended', 'pending_activation'])
      .notNullable()
      .defaultTo('active');
    t.enum('access_level', ['basic', 'standard', 'pro', 'enterprise'])
      .notNullable()
      .defaultTo('standard');
    t.bigInteger('issued_at').notNullable();
    t.bigInteger('expires_at').defaultTo(0);
    t.integer('max_activations').defaultTo(0);
    t.integer('activation_count').defaultTo(0);
    t.boolean('transferable').defaultTo(false);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamps(true, true);
  });

  // API Keys
  await knex.schema.createTable('api_keys', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('key_hash', 128).notNullable().unique();
    t.string('key_prefix', 12).notNullable(); // first chars for display (e.g. "sk_live_abc")
    t.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');
    t.string('owner_address', 64).notNullable();
    t.string('api_id', 128).notNullable();
    t.integer('rpm_limit').defaultTo(60);
    t.integer('rpd_limit').defaultTo(10000);
    t.integer('rpm_month').defaultTo(300000);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.bigInteger('issued_at').notNullable();
    t.bigInteger('expires_at').defaultTo(0);
    t.bigInteger('total_requests').defaultTo(0);
    t.timestamps(true, true);
  });

  // Content Licenses
  await knex.schema.createTable('content_licenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('on_chain_id', 128).notNullable().unique();
    t.string('issuer_address', 64).notNullable();
    t.string('holder_address', 64).notNullable();
    t.string('content_id', 255).notNullable();
    t.enum('access_type', ['lifetime', 'time_based', 'single_use'])
      .notNullable()
      .defaultTo('lifetime');
    t.enum('status', ['active', 'expired', 'consumed', 'revoked'])
      .notNullable()
      .defaultTo('active');
    t.bigInteger('issued_at').notNullable();
    t.bigInteger('expires_at').defaultTo(0);
    t.boolean('transferable').defaultTo(false);
    t.boolean('consumed').defaultTo(false);
    t.timestamps(true, true);
  });

  // License events log (for webhooks / analytics)
  await knex.schema.createTable('license_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('on_chain_license_id', 128);
    t.string('event_type', 64).notNullable(); // issued | activated | revoked | renewed | transferred
    t.string('actor_address', 64);
    t.jsonb('payload').defaultTo('{}');
    t.string('tx_hash', 128);
    t.bigInteger('ledger_sequence');
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
  });

  // Webhook subscriptions
  await knex.schema.createTable('webhooks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('url', 512).notNullable();
    t.specificType('events', 'text[]').notNullable();
    t.string('secret', 128).notNullable(); // HMAC signing secret
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhooks');
  await knex.schema.dropTableIfExists('license_events');
  await knex.schema.dropTableIfExists('content_licenses');
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('licenses');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('users');
}
