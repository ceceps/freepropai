import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save, Edit, Camera, Loader2, Image, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import ZoomableImage from '../components/common/ZoomableImage';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
  portraitPhotoUrl?: string;
  fullbodyPhotoUrl?: string;
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'avatar' | 'portrait' | 'fullbody' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatarUrl: user?.avatarUrl || '',
    portraitPhotoUrl: user?.portraitPhotoUrl || '',
    fullbodyPhotoUrl: user?.fullbodyPhotoUrl || '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        avatarUrl: user.avatarUrl || '',
        portraitPhotoUrl: user.portraitPhotoUrl || '',
        fullbodyPhotoUrl: user.fullbodyPhotoUrl || '',
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      setSuccessMsg('Profil berhasil disimpan!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setErrorMsg(error.message || 'Gagal menyimpan profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const validateAndUploadFile = async (
    file: File,
    field: 'avatarUrl' | 'portraitPhotoUrl' | 'fullbodyPhotoUrl',
    uploadKey: 'avatar' | 'portrait' | 'fullbody'
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate size max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5MB');
      return;
    }

    // Validate type PNG & JPG/JPEG
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Hanya format PNG dan JPG/JPEG yang diperbolehkan');
      return;
    }

    try {
      setUploadingField(uploadKey);
      const res = await authApi.uploadPhoto(file);
      if (res.success && res.data?.url) {
        handleChange(field, res.data.url);
        // Automatically persist change if not in editing mode
        if (!isEditing) {
          await updateProfile({
            ...profileData,
            [field]: res.data.url,
          });
          setSuccessMsg('Foto berhasil diunggah!');
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } else {
        setErrorMsg(res.error || 'Gagal mengunggah foto');
      }
    } catch (err: any) {
      console.error('Failed to upload photo:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Gagal mengunggah foto');
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Profile & Model Reference</h1>
          <p className="text-text-secondary mt-1">Kelola data diri dan foto referensi model untuk AI Storyboard Planner.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Toast Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl text-green-700 dark:text-green-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSave}>
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-border text-center sm:text-left">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden border-2 border-primary-500 shadow-md">
                  {profileData.avatarUrl ? (
                    <img src={profileData.avatarUrl} alt={profileData.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-14 h-14 text-primary-600 dark:text-primary-400" />
                  )}
                  {uploadingField === 'avatar' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) validateAndUploadFile(file, 'avatarUrl', 'avatar');
                    }}
                  />
                  <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors">
                    <Camera className="w-4 h-4" />
                  </div>
                </label>
              </div>

              <div className="flex-1 space-y-1">
                <h2 className="text-2xl font-bold text-text-primary">{profileData.name || 'Nama Lengkap'}</h2>
                <p className="text-text-secondary text-sm">{profileData.email}</p>
                {profileData.phone && (
                  <p className="text-text-tertiary text-xs flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <Phone className="w-3.5 h-3.5" /> {profileData.phone}
                  </p>
                )}
                {profileData.location && (
                  <p className="text-text-tertiary text-xs flex items-center justify-center sm:justify-start gap-2">
                    <MapPin className="w-3.5 h-3.5" /> {profileData.location}
                  </p>
                )}
                <p className="text-[11px] text-text-tertiary pt-2">
                  Ganti foto profil dengan klik ikon kamera. Format PNG/JPG, maksimal 5MB.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="input-label">Nama Lengkap</label>
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
                    className="input bg-grey-50 dark:bg-grey-800 cursor-not-allowed text-text-tertiary"
                    value={profileData.email}
                    disabled
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="input-label">Nomor Telepon / WhatsApp</label>
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
                  <label htmlFor="location" className="input-label">Lokasi / Kota Operasional</label>
                  <input
                    type="text"
                    id="location"
                    className="input"
                    value={profileData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Bandung, Jawa Barat"
                  />
                </div>
              </div>

              {/* Role Display (Read-only) */}
              <div className="pt-4 border-t border-border">
                <label className="input-label">Role Akun</label>
                <div className="input bg-grey-50 dark:bg-grey-800 text-text-secondary cursor-not-allowed">
                  {user?.role?.replace('_', ' ').toUpperCase() || 'SOLO AGENT'}
                </div>
              </div>
            </div>

            {/* Actions */}
            {isEditing && (
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    if (user) {
                      setProfileData({
                        name: user.name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        location: user.location || '',
                        avatarUrl: user.avatarUrl || '',
                        portraitPhotoUrl: user.portraitPhotoUrl || '',
                        fullbodyPhotoUrl: user.fullbodyPhotoUrl || '',
                      });
                    }
                    setIsEditing(false);
                  }}
                  className="btn btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Model Storyboard Card */}
      <div className="card">
        <div className="card-header border-b border-border pb-4">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Image className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Model Storyboard Photos (Foto Referensi Model Agent)
          </h3>
          <p className="text-xs text-text-tertiary mt-1">
            Unggah foto referensi diri / model agen properti kamu (Portrait & Full Body) untuk digunakan pada fitur AI Storyboard Generator.
          </p>
        </div>
        <div className="card-body pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Portrait Foto Upload */}
            <div className="space-y-3 p-4 border border-border rounded-xl bg-grey-50/50 dark:bg-grey-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-text-primary">Portrait Foto (Close-up / Setengah Badan)</h4>
                  <p className="text-[11px] text-text-tertiary">Foto tampak dada/wajah rapi profesional.</p>
                </div>
                <span className="text-[10px] font-mono text-text-tertiary">PNG/JPG &le; 5MB</span>
              </div>

              <div className="relative group w-full h-52 bg-white dark:bg-grey-900 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden hover:border-primary-500 transition-all">
                {profileData.portraitPhotoUrl ? (
                  <ZoomableImage
                    src={profileData.portraitPhotoUrl}
                    alt="Portrait Model Foto"
                    className="w-full h-full object-cover"
                    downloadName="model-portrait.jpg"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                    <p className="text-xs font-medium text-text-secondary">Pilih file foto Portrait</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">Format PNG, JPG (Maks. 5MB)</p>
                  </div>
                )}

                {uploadingField === 'portrait' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <span>Mengunggah Portrait Foto...</span>
                  </div>
                )}

                <label className="absolute inset-0 cursor-pointer opacity-0">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) validateAndUploadFile(file, 'portraitPhotoUrl', 'portrait');
                    }}
                  />
                </label>
              </div>

              {profileData.portraitPhotoUrl && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Portrait Foto Tersedia
                  </span>
                  <label className="text-primary-600 hover:text-primary-700 font-semibold cursor-pointer text-[11px]">
                    Ganti Foto
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) validateAndUploadFile(file, 'portraitPhotoUrl', 'portrait');
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Full Body Foto Upload */}
            <div className="space-y-3 p-4 border border-border rounded-xl bg-grey-50/50 dark:bg-grey-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-text-primary">Full Body Foto (Seluruh Badan)</h4>
                  <p className="text-[11px] text-text-tertiary">Foto pakaian lengkap berdiri / pose agen.</p>
                </div>
                <span className="text-[10px] font-mono text-text-tertiary">PNG/JPG &le; 5MB</span>
              </div>

              <div className="relative group w-full h-52 bg-white dark:bg-grey-900 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden hover:border-primary-500 transition-all">
                {profileData.fullbodyPhotoUrl ? (
                  <ZoomableImage
                    src={profileData.fullbodyPhotoUrl}
                    alt="Full Body Model Foto"
                    className="w-full h-full object-cover"
                    downloadName="model-fullbody.jpg"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                    <p className="text-xs font-medium text-text-secondary">Pilih file foto Full Body</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">Format PNG, JPG (Maks. 5MB)</p>
                  </div>
                )}

                {uploadingField === 'fullbody' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <span>Mengunggah Full Body Foto...</span>
                  </div>
                )}

                <label className="absolute inset-0 cursor-pointer opacity-0">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) validateAndUploadFile(file, 'fullbodyPhotoUrl', 'fullbody');
                    }}
                  />
                </label>
              </div>

              {profileData.fullbodyPhotoUrl && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Full Body Foto Tersedia
                  </span>
                  <label className="text-primary-600 hover:text-primary-700 font-semibold cursor-pointer text-[11px]">
                    Ganti Foto
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) validateAndUploadFile(file, 'fullbodyPhotoUrl', 'fullbody');
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-text-primary">Account Information</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-grey-50 dark:bg-grey-800 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">Email Terdaftar</p>
                <p className="text-sm font-semibold text-text-primary">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-grey-50 dark:bg-grey-800 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">Status Akun</p>
                <p className="text-sm font-semibold text-text-primary">Aktif</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
