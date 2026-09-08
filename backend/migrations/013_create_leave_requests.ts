import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_requests', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('leave_type_id').notNullable().references('id').inTable('leave_types').onDelete('RESTRICT');
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.decimal('total_days', 5, 1).notNullable();
    t.text('reason').notNullable();
    t.string('attachment_path', 500);
    t.string('status', 20).notNullable().defaultTo('PENDING');
    t.integer('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at');
    t.text('review_comment');
    t.timestamps(true, true);

    t.index(['user_id']);
    t.index(['status']);
    t.index(['start_date']);
    t.index(['end_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_requests');
}
