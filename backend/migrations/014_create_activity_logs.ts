import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('activity_logs', (t) => {
    t.bigIncrements('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('attendance_id').references('id').inTable('attendance').onDelete('SET NULL');
    t.string('activity_type', 50).notNullable();
    t.jsonb('metadata');
    t.timestamp('timestamp').notNullable();
    t.string('ip_address', 50);
    t.jsonb('device_information');

    t.index(['user_id']);
    t.index(['attendance_id']);
    t.index(['activity_type']);
    t.index(['timestamp']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activity_logs');
}
