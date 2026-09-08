import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attendance_verifications', (t) => {
    t.increments('id').primary();
    t.integer('attendance_id').notNullable().references('id').inTable('attendance').onDelete('RESTRICT');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('verification_type', 20).notNullable(); // CHECK_IN | CHECK_OUT | RANDOM_CHECK
    t.string('verification_method', 30).notNullable().defaultTo('SELFIE');
    t.string('image_path', 500);
    t.string('image_hash', 64);
    t.timestamp('captured_at').notNullable();
    t.timestamp('server_timestamp').notNullable();
    t.string('ip_address', 50);
    t.text('user_agent');
    t.jsonb('device_information');
    t.string('verification_status', 20).notNullable().defaultTo('VERIFIED');
    t.text('failure_reason');
    t.timestamps(true, true);

    t.index(['attendance_id']);
    t.index(['user_id']);
    t.index(['verification_type']);
    t.index(['verification_status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_verifications');
}
