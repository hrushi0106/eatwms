import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 50).notNullable();
    t.string('title', 200).notNullable();
    t.text('message').notNullable();
    t.string('entity_type', 50);
    t.integer('entity_id');
    t.boolean('is_read').defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('read_at');

    t.index(['user_id']);
    t.index(['is_read']);
    t.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}
