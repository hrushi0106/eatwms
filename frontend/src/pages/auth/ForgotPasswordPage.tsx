import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheckIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">WorkMonitor</h1>
        </div>
        <div className="card p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
              <p className="text-gray-500 mt-2 text-sm">If that email is registered, you'll receive a password reset link shortly.</p>
              <Link to="/login" className="btn-primary mt-6 inline-block">Back to login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input type="email" className={`input ${errors.email ? 'border-red-400' : ''}`} placeholder="you@company.com" {...register('email')} />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-4">
                <ArrowLeftIcon className="h-4 w-4" /> Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
