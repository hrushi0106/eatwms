import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('employee_code', 20).notNullable().unique();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.string('email', 255).notNullable().unique();
    t.string('phone', 20);
    t.string('password_hash', 255).notNullable();
    t.integer('role_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT');
    t.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
    t.integer('manager_id').references('id').inTable('users').onDelete('SET NULL');
    t.integer('team_lead_id').references('id').inTable('users').onDelete('SET NULL');
    t.date('joining_date');
    t.string('status', 20).notNullable().defaultTo('ACTIVE');
    t.string('refresh_token_hash', 255);
    t.string('password_reset_token', 255);
    t.timestamp('password_reset_expires');
    t.timestamps(true, true);

    t.index(['email']);
    t.index(['employee_code']);
    t.index(['role_id']);
    t.index(['department_id']);
    t.index(['manager_id']);
    t.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
