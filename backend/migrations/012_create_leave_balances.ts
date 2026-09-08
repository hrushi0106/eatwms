import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_balances', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('leave_type_id').notNullable().references('id').inTable('leave_types').onDelete('CASCADE');
    t.integer('year').notNullable();
    t.decimal('allocated_days', 5, 1).notNullable();
    t.decimal('used_days', 5, 1).defaultTo(0);
    t.timestamps(true, true);

    t.unique(['user_id', 'leave_type_id', 'year']);
    t.index(['user_id']);
    t.index(['year']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_balances');
}
