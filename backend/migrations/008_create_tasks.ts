import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasks', (t) => {
    t.increments('id').primary();
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('RESTRICT');
    t.integer('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    t.integer('assigned_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('name', 300).notNullable();
    t.text('description');
    t.string('priority', 20).notNullable().defaultTo('MEDIUM');
    t.decimal('estimated_hours', 6, 2);
    t.date('due_date');
    t.string('status', 20).notNullable().defaultTo('TODO');
    t.integer('progress_percentage').defaultTo(0);
    t.timestamps(true, true);

    t.index(['project_id']);
    t.index(['assigned_to']);
    t.index(['status']);
    t.index(['priority']);
  });

  await knex.raw(`
    ALTER TABLE tasks
    ADD CONSTRAINT chk_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tasks');
}
