import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attendance_exceptions', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('attendance_id').references('id').inTable('attendance').onDelete('SET NULL');
    t.string('exception_type', 30).notNullable();
    t.string('severity', 10).notNullable();
    t.text('description').notNullable();
    t.string('status', 20).notNullable().defaultTo('OPEN');
    t.integer('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at');
    t.text('review_comment');
    t.date('exception_date').notNullable();
    t.timestamps(true, true);

    t.index(['user_id']);
    t.index(['exception_type']);
    t.index(['status']);
    t.index(['exception_date']);
    t.index(['severity']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_exceptions');
}
