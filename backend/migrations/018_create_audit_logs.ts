import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (t) => {
    t.bigIncrements('id').primary();
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 50).notNullable();
    t.string('entity_type', 50);
    t.integer('entity_id');
    t.jsonb('old_value');
    t.jsonb('new_value');
    t.string('ip_address', 50);
    t.text('user_agent');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['user_id']);
    t.index(['action']);
    t.index(['entity_type']);
    t.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
