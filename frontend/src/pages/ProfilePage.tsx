import { useState } from 'react';
import { User, Mail, Phone, MapPin, Save, Edit, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Profile</h1>
          <p className="text-text-secondary mt-1">Manage your account settings and personal information.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSave}>
            {/* Avatar Section */}
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                  {profileData.avatarUrl ? (
                    <img src={profileData.avatarUrl} alt={profileData.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => handleChange('avatarUrl', event.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors">
                      <Camera className="w-4 h-4" />
                    </div>
                  </label>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-text-primary">{profileData.name || 'Your Name'}</h2>
                <p className="text-text-secondary">{profileData.email}</p>
                {profileData.phone && (
                  <p className="text-text-tertiary mt-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> {profileData.phone}
                  </p>
                )}
                {profileData.location && (
                  <p className="text-text-tertiary flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {profileData.location}
                  </p>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="input-label">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    className="input"
                    value={profileData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="input-label">Email</label>
                  <input
                    type="email"
                    id="email"
                    className="input bg-grey-50 dark:bg-grey-800 cursor-not-allowed"
                    value={profileData.email}
                    disabled
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="input-label">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    className="input"
                    value={profileData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="+62 812-3456-7890"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="input-label">Location</label>
                  <input
                    type="text"
                    id="location"
                    className="input"
                    value={profileData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Jakarta, Indonesia"
                  />
                </div>
              </div>

              {/* Role Display (Read-only) */}
              <div className="pt-6 border-t border-border">
                <label className="input-label">Role</label>
                <div className="input bg-grey-50 dark:bg-grey-800 text-text-secondary cursor-not-allowed">
                  {user?.role?.replace('_', ' ') || 'Agent'}
                </div>
              </div>
            </div>

            {/* Actions */}
            {isEditing && (
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setProfileData({
                      name: user?.name || '',
                      email: user?.email || '',
                      phone: '',
                      location: '',
                    });
                    setIsEditing(false);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-text-primary">Account Information</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-grey-50 dark:bg-grey-800 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-tertiary">Email</p>
                <p className="text-text-primary">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-grey-50 dark:bg-grey-800 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-tertiary">Member Since</p>
                <p className="text-text-primary">2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}