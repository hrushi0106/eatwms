import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_types', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
    t.text('description');
    t.decimal('annual_limit', 5, 1).notNullable();
    t.boolean('is_paid').defaultTo(true);
    t.string('status', 20).notNullable().defaultTo('ACTIVE');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_types');
}
