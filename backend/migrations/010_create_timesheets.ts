import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('timesheets', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('attendance_id').references('id').inTable('attendance').onDelete('SET NULL');
    t.date('date').notNullable();
    t.integer('project_id').notNullable().references('id').inTable('projects').onDelete('RESTRICT');
    t.integer('task_id').references('id').inTable('tasks').onDelete('SET NULL');
    t.time('start_time');
    t.time('end_time');
    t.decimal('hours', 5, 2).notNullable();
    t.decimal('overtime_hours', 5, 2).defaultTo(0);
    t.text('description').notNullable();
    t.text('comment');
    t.boolean('is_billable').defaultTo(true);
    t.string('status', 20).notNullable().defaultTo('DRAFT');
    t.integer('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at');
    t.timestamps(true, true);

    t.index(['user_id']);
    t.index(['date']);
    t.index(['project_id']);
    t.index(['status']);
    t.index(['attendance_id']);
  });

  await knex.raw(`ALTER TABLE timesheets ADD CONSTRAINT chk_hours_positive CHECK (hours > 0)`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('timesheets');
}
