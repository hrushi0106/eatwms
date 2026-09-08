import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('task_updates', (t) => {
    t.increments('id').primary();
    t.integer('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('progress_percentage');
    t.text('work_update').notNullable();
    t.decimal('time_spent', 6, 2);
    t.text('remaining_work');
    t.text('blocker');
    t.timestamps(true, true);

    t.index(['task_id']);
    t.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('task_updates');
}
