import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { SystemSetting } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { CogIcon, CheckIcon } from '@heroicons/react/24/outline';

const SECTIONS = [
  {
    title: 'Organization',
    keys: ['organization_name', 'timezone'],
  },
  {
    title: 'Work Hours',
    keys: ['standard_work_hours', 'standard_start_time', 'standard_end_time', 'grace_period_minutes'],
  },
  {
    title: 'Attendance Monitoring',
    keys: ['idle_threshold_minutes', 'engagement_interval_minutes'],
  },
  {
    title: 'Privacy & Retention',
    keys: ['selfie_retention_days', 'activity_retention_days', 'audit_retention_days'],
  },
  {
    title: 'Random Verification (V2)',
    keys: ['random_verification_enabled', 'random_verification_min_interval', 'random_verification_max_interval', 'response_timeout_seconds'],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/settings').then((r) => {
      const data: SystemSetting[] = r.data.data || [];
      const s: Record<string, string> = {};
      const d: Record<string, string> = {};
      data.forEach((item) => {
        s[item.setting_key] = item.setting_value;
        if (item.description) d[item.setting_key] = item.description;
      });
      setSettings(s);
      setDescriptions(d);
    }).finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setChanged((prev) => ({ ...prev, [key]: value }));
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(changed).length === 0) { toast('No changes to save'); return; }
    setSaving(true);
    try {
      await api.put('/settings', changed);
      toast.success('Settings saved successfully');
      setChanged({});
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">System Settings</h1>
        <button onClick={handleSave} disabled={saving || Object.keys(changed).length === 0}
          className="btn-primary">
          {saving ? 'Saving…' : <><CheckIcon className="h-4 w-4" />Save Changes</>}
        </button>
      </div>
      {Object.keys(changed).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          {Object.keys(changed).length} unsaved change{Object.keys(changed).length !== 1 ? 's' : ''}. Click Save to apply.
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.title} className="card p-6">
          <h2 className="section-title mb-5 flex items-center gap-2">
            <CogIcon className="h-5 w-5 text-gray-400" />
            {section.title}
          </h2>
          <div className="space-y-5">
            {section.keys.map((key) => {
              if (!(key in settings)) return null;
              const value = settings[key];
              const isModified = key in changed;
              return (
                <div key={key}>
                  <label className={`label ${isModified ? 'text-blue-600' : ''}`}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    {isModified && <span className="ml-1 text-blue-600 text-xs">(modified)</span>}
                  </label>
                  {descriptions[key] && <p className="text-xs text-gray-400 mb-1">{descriptions[key]}</p>}
                  {value === 'true' || value === 'false' ? (
                    <select
                      value={value}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className={`input w-40 ${isModified ? 'border-blue-400' : ''}`}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <input
                      value={value}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className={`input max-w-xs ${isModified ? 'border-blue-400' : ''}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
