import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('engagement_prompts', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('attendance_id').notNullable().references('id').inTable('attendance').onDelete('CASCADE');
    t.timestamp('prompt_time').notNullable();
    t.timestamp('response_time');
    t.string('response', 30);
    t.integer('response_duration_seconds');
    t.string('status', 20).notNullable().defaultTo('PENDING');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['user_id']);
    t.index(['attendance_id']);
    t.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('engagement_prompts');
}
