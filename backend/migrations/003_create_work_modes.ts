import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('work_modes', (t) => {
    t.increments('id').primary();
    t.string('code', 20).notNullable().unique();
    t.string('name', 50).notNullable();
    t.text('description');
    t.string('status', 20).notNullable().defaultTo('ACTIVE');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('work_modes');
}
