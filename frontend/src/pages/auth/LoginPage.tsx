import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  EyeIcon, 
  EyeSlashIcon,
  ClockIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  UsersIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ThemeToggle from '../../components/ui/ThemeToggle';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await login(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed. Please check your credentials.';
      setError('root', { message: msg });
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="default" size="md" />
      </div>

      {/* Left Side - Features */}
      <div className="hidden lg:flex flex-col justify-center w-2/5 p-8 xl:p-12 relative z-10">
        <div className="mb-8 xl:mb-12">
          <h1 className="text-3xl xl:text-4xl font-bold text-white mb-4">
            Work Smarter
            <br />
            <span className="text-cyan-400">Every Day</span>
          </h1>
          <p className="text-blue-200 text-base xl:text-lg leading-relaxed">
            Track your time, manage attendance and stay productive with EvoluXion.
          </p>
        </div>

        <div className="space-y-6 xl:space-y-8">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <CalendarDaysIcon className="w-5 h-5 xl:w-6 xl:h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-sm xl:text-base">Attendance Tracking</h3>
              <p className="text-blue-200 text-xs xl:text-sm">Mark and manage your attendance seamlessly</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-green-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ClockIcon className="w-5 h-5 xl:w-6 xl:h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-sm xl:text-base">Timesheet Management</h3>
              <p className="text-blue-200 text-xs xl:text-sm">Log your work hours easily</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ChartBarIcon className="w-5 h-5 xl:w-6 xl:h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-sm xl:text-base">Real-time Insights</h3>
              <p className="text-blue-200 text-xs xl:text-sm">Stay informed and productive</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-orange-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheckIcon className="w-5 h-5 xl:w-6 xl:h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-sm xl:text-base">Secure & Reliable</h3>
              <p className="text-blue-200 text-xs xl:text-sm">Your data is always protected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Center - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Features (visible only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Work Smarter <span className="text-cyan-400">Every Day</span>
            </h1>
            <p className="text-blue-200 text-sm">
              Track your time, manage attendance and stay productive
            </p>
          </div>

          {/* Logo */}
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
              <span className="text-xl lg:text-2xl font-bold text-white">E</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">
              Evolu<span className="text-cyan-400">X</span>ion
            </h2>
            <p className="text-xs lg:text-sm text-blue-200 font-medium">WORKFORCE SOLUTIONS</p>
            <p className="text-blue-300 text-xs lg:text-sm mt-2">Employee Attendance & Timesheet System</p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">Sign in to your account</h3>
              <p className="text-slate-400 text-sm">Welcome back! Please enter your credentials to continue.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UsersIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${
                      errors.email ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-600'
                    }`}
                    placeholder="you@company.com"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="mt-2 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheckIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`w-full pl-10 pr-12 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${
                      errors.password ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-600'
                    }`}
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-xs text-red-400">{errors.password.message}</p>}
              </div>

              {errors.root && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-400">{errors.root.message}</p>
                </div>
              )}

              <div className="flex items-center justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed transform hover:scale-[1.02] disabled:hover:scale-100"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <span className="text-lg">→</span>
                  </span>
                )}
              </button>
            </form>

            {/* Development Credentials */}
            {(import.meta as any).env?.DEV && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <CodeBracketIcon className="w-4 h-4" />
                  Development Credentials
                </button>
                
                {showCredentials && (
                  <div className="mt-3 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                    <div className="space-y-2 text-xs font-mono">
                      <div className="text-slate-300">
                        <span className="text-blue-400">Admin:</span> admin@company.com / Admin@123
                      </div>
                      <div className="text-slate-300">
                        <span className="text-green-400">Manager:</span> manager@company.com / Manager@123
                      </div>
                      <div className="text-slate-300">
                        <span className="text-purple-400">Team Lead:</span> teamlead@company.com / Lead@123
                      </div>
                      <div className="text-slate-300">
                        <span className="text-orange-400">Employee:</span> employee@company.com / Employee@123
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © 2026 EvoluXion Software Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
