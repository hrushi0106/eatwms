import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attendance', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.date('attendance_date').notNullable();
    t.integer('work_mode_id').notNullable().references('id').inTable('work_modes').onDelete('RESTRICT');
    t.timestamp('check_in_time').notNullable();
    t.timestamp('check_out_time');
    t.integer('total_work_minutes').defaultTo(0);
    t.integer('regular_work_minutes').defaultTo(0);
    t.integer('overtime_minutes').defaultTo(0);
    t.string('status', 30).notNullable().defaultTo('CHECKED_IN');
    t.string('check_in_ip', 50);
    t.string('check_out_ip', 50);
    t.text('check_in_user_agent');
    t.text('check_out_user_agent');
    t.string('check_in_device', 100);
    t.string('check_out_device', 100);
    t.uuid('session_id').notNullable().unique();
    t.text('notes');
    t.timestamps(true, true);

    // Only one active attendance per user per day
    t.unique(['user_id', 'attendance_date']);
    t.index(['user_id']);
    t.index(['attendance_date']);
    t.index(['status']);
    t.index(['work_mode_id']);
  });

  // Ensure check_out_time > check_in_time when set
  await knex.raw(`
    ALTER TABLE attendance
    ADD CONSTRAINT chk_checkout_after_checkin
    CHECK (check_out_time IS NULL OR check_out_time > check_in_time)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance');
}
