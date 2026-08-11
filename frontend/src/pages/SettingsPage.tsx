import { useState } from 'react';
import { Bell, Shield, Palette, Globe, Save, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

type NotificationKeys = keyof typeof notifications;

const notifications = {
  email: true,
  push: true,
  leads: true,
  followups: true,
  marketing: false,
};

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [notificationState, setNotificationState] = useState(notifications);
  const [language, setLanguage] = useState('en');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your preferences and account settings.</p>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Appearance</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Dark Mode</p>
              <p className="text-sm text-text-tertiary">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-primary-600' : 'bg-grey-300 dark:bg-grey-600'
              }`}
              role="switch"
              aria-checked={theme === 'dark'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Notifications</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
            { key: 'push', label: 'Push Notifications', desc: 'Receive push notifications in browser' },
            { key: 'leads', label: 'New Leads', desc: 'Get notified when new leads come in' },
            { key: 'followups', label: 'Follow-up Reminders', desc: 'Reminders for scheduled follow-ups' },
            { key: 'marketing', label: 'Marketing Updates', desc: 'Receive product updates and tips' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">{item.label}</p>
                <p className="text-sm text-text-tertiary">{item.desc}</p>
              </div>
              <button
                onClick={() => setNotificationState(prev => ({ ...prev, [item.key]: !prev[item.key as NotificationKeys] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationState[item.key as NotificationKeys] ? 'bg-primary-600' : 'bg-grey-300 dark:bg-grey-600'
                }`}
                role="switch"
                aria-checked={notificationState[item.key as NotificationKeys]}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationState[item.key as NotificationKeys] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Language & Region</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="language" className="input-label">Language</label>
              <select
                id="language"
                className="input"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="id">Indonesian</option>
              </select>
            </div>
            <div>
              <label htmlFor="timezone" className="input-label">Timezone</label>
              <select id="timezone" className="input" defaultValue="Asia/Jakarta">
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Security</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <button className="btn btn-outline w-full justify-start">
            Change Password
          </button>
          <button className="btn btn-outline w-full justify-start">
            Two-Factor Authentication
          </button>
          <button className="btn btn-outline w-full justify-start">
            Active Sessions
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}