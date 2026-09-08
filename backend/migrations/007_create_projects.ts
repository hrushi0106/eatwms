import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('projects', (t) => {
    t.increments('id').primary();
    t.string('project_code', 20).notNullable().unique();
    t.string('name', 200).notNullable();
    t.text('description');
    t.string('client_name', 200);
    t.date('start_date');
    t.date('end_date');
    t.string('status', 20).notNullable().defaultTo('ACTIVE');
    t.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);

    t.index(['status']);
    t.index(['created_by']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('projects');
}
