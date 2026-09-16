import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (SQLite compatible)
  await knex('system_settings').del();
  
  // Reset auto-increment (SQLite compatible)
  await knex.raw("DELETE FROM sqlite_sequence WHERE name='system_settings'");
  await knex('system_settings').insert([
    { setting_key: 'organization_name', setting_value: 'My Organization', description: 'Organization display name' },
    { setting_key: 'timezone', setting_value: 'Asia/Kolkata', description: 'Default display timezone' },
    { setting_key: 'standard_work_hours', setting_value: '8', description: 'Standard work hours per day' },
    { setting_key: 'standard_start_time', setting_value: '09:00', description: 'Standard shift start time (HH:MM)' },
    { setting_key: 'standard_end_time', setting_value: '18:00', description: 'Standard shift end time (HH:MM)' },
    { setting_key: 'grace_period_minutes', setting_value: '15', description: 'Grace period for late check-in (minutes)' },
    { setting_key: 'idle_threshold_minutes', setting_value: '30', description: 'Minutes of inactivity before idle alert' },
    { setting_key: 'engagement_interval_minutes', setting_value: '24', description: 'Minutes between engagement prompts' },
    { setting_key: 'random_verification_enabled', setting_value: 'false', description: 'Enable random camera verification (V2)' },
    { setting_key: 'random_verification_min_interval', setting_value: '60', description: 'Min minutes between random checks' },
    { setting_key: 'random_verification_max_interval', setting_value: '120', description: 'Max minutes between random checks' },
    { setting_key: 'response_timeout_seconds', setting_value: '300', description: 'Timeout for random check response' },
    { setting_key: 'selfie_retention_days', setting_value: '90', description: 'Days to retain selfie images' },
    { setting_key: 'activity_retention_days', setting_value: '180', description: 'Days to retain activity logs' },
    { setting_key: 'audit_retention_days', setting_value: '365', description: 'Days to retain audit logs' },
  ]);
}
