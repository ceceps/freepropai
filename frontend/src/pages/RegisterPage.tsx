import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['solo_agent', 'team_owner', 'team_agent']).default('solo_agent'),
  regionScope: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'solo_agent',
      regionScope: '',
    },
  });

  const onSubmit = async (data: any) => {
    setError(null);
    setIsLoading(true);
    try {
      await registerUser(data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary dark:bg-bg-primary-dark px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-text-primary dark:text-text-primary">FreePropAI</span>
          </Link>
        </div>

        {/* Register Card */}
        <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary mb-2">Create an account</h1>
          <p className="text-text-secondary dark:text-text-secondary mb-8">Join FreePropAI to manage your properties and leads</p>

          {error && (
            <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-600 dark:text-danger-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-text-primary dark:text-text-primary mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary" />
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    className={`w-full pl-10 pr-4 py-3 bg-secondary-100 dark:bg-secondary-800 border border-border dark:border-border rounded-lg text-text-primary dark:text-text-primary placeholder-text-tertiary dark:placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.name ? 'border-danger-500' : ''
                    }`}
                    placeholder="John Doe"
                    disabled={isLoading}
                  />
                  {errors.name && <p className="mt-1.5 text-sm text-danger-500">{errors.name.message as string}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-text-primary dark:text-text-primary mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary" />
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={`w-full pl-10 pr-4 py-3 bg-secondary-100 dark:bg-secondary-800 border border-border dark:border-border rounded-lg text-text-primary dark:text-text-primary placeholder-text-tertiary dark:placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.email ? 'border-danger-500' : ''
                    }`}
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                  {errors.email && <p className="mt-1.5 text-sm text-danger-500">{errors.email.message as string}</p>}
                </div>
              </div>

              {/* Phone & Region */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-text-primary dark:text-text-primary mb-1.5">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary" />
                  <input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    className="w-full pl-10 pr-4 py-3 bg-secondary-100 dark:bg-secondary-800 border border-border dark:border-border rounded-lg text-text-primary dark:text-text-primary placeholder-text-tertiary dark:placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="+62..."
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="regionScope" className="block text-sm font-medium text-text-primary dark:text-text-primary mb-1.5">
                  Region (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary" />
                  <input
                    id="regionScope"
                    type="text"
                    {...register('regionScope')}
                    className="w-full pl-10 pr-4 py-3 bg-secondary-100 dark:bg-secondary-800 border border-border dark:border-border rounded-lg text-text-primary dark:text-text-primary placeholder-text-tertiary dark:placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="e.g. Jakarta Selatan"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Role */}
              <div className="md:col-span-2">
                <label htmlFor="role" className="block text-sm font-medium text-text-primary dark:text-text-primary mb-1.5">
                  I am a...
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary" />
                  <select
                    id="role"
                    {...register('role')}
                    className="w-full pl-10 pr-4 py-3 bg-secondary-100 dark:bg-secondary-800 border border-border dark:border-border rounded-lg text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none"
                    disabled={isLoading}
                  >
                    <option value="solo_agent">Solo Agent (Independent)</option>
                    <option value="team_owner">Team Owner / Agency</option>
                    <option value="team_agent">Team Agent (Part of an agency)</option>
                  </select>
                </div>
              </div>

              {/* Passwords */}
              <div className="md:col-span-2">
                <label htmlFor="password" className="block text-sm font-medium text-text-primary dark:text-text-primary mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className={`w-full pl-10 pr-12 py-3 bg-secondary-100 dark:bg-secondary-800 border border-border dark:border-border rounded-lg text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.password ? 'border-danger-500' : ''
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {errors.password && <p className="mt-1.5 text-sm text-danger-500">{errors.password.message as string}</p>}
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary dark:text-text-primary mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className={`w-full pl-10 pr-12 py-3 bg-secondary-100 dark:bg-secondary-800 border border-border dark:border-border rounded-lg text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      errors.confirmPassword ? 'border-danger-500' : ''
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && <p className="mt-1.5 text-sm text-danger-500">{errors.confirmPassword.message as string}</p>}
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-bg-primary-dark disabled:opacity-50 transition-all mt-4"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-text-secondary dark:text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}