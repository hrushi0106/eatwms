import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Must include uppercase').regex(/[0-9]/, 'Must include number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await authApi.resetPassword(token, data.password);
      toast.success('Password reset successfully');
      navigate('/login');
    } catch {
      toast.error('Reset link is invalid or expired');
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
        </div>
        <div className="card p-8">
          <h2 className="text-xl font-bold mb-2">Set new password</h2>
          <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input type="password" className={`input ${errors.password ? 'border-red-400' : ''}`} {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className={`input ${errors.confirmPassword ? 'border-red-400' : ''}`} {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <Link to="/login" className="block text-center text-sm text-blue-600 mt-4">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
