import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import WebcamCapture from '../../components/webcam/WebcamCapture';
import { Attendance } from '../../types';
import { formatTime, formatMinutes } from '../../utils/format';
import toast from 'react-hot-toast';

type Stage = 'confirm' | 'webcam' | 'success';

export default function CheckOutPage() {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [stage, setStage] = useState<Stage>('confirm');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/today')
      .then((r) => {
        const att = r.data.data?.attendance;
        if (!att || att.status !== 'CHECKED_IN') {
          toast('No active check-in session found', { icon: 'ℹ️' });
          navigate('/dashboard');
        } else {
          setAttendance(att);
        }
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handleCapture = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('selfie', file);
      const res = await api.post('/attendance/check-out', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data.attendance);
      setStage('success');
      toast.success('Check-out successful!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Check-out failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (stage === 'success' && result) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-Out Successful!</h2>
        <p className="text-gray-500 mb-2">Checked out at <strong>{formatTime(result.check_out_time!)}</strong></p>
        <p className="text-gray-500 mb-1">Total work: <strong className="text-green-600">{formatMinutes(result.total_work_minutes)}</strong></p>
        {result.overtime_minutes > 0 && (
          <p className="text-orange-600 text-sm mb-1">Overtime: {formatMinutes(result.overtime_minutes)}</p>
        )}
        <div className="flex gap-3 justify-center mt-8">
          <button onClick={() => navigate('/dashboard')} className="btn-primary">Dashboard</button>
          <button onClick={() => navigate('/timesheet/new')} className="btn-secondary">Add Timesheet</button>
        </div>
      </div>
    );
  }

  if (stage === 'webcam') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-6">
          <h2 className="section-title mb-4">Check-Out Verification</h2>
          <WebcamCapture onCapture={handleCapture} onCancel={() => setStage('confirm')} isUploading={isUploading} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check Out</h2>
        <p className="text-sm text-gray-500 mb-6">A selfie verification is required to complete your check-out.</p>

        {attendance && (
          <div className="bg-gray-50 rounded-xl p-4 mb-8 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Checked In</span>
              <span className="text-sm font-semibold">{formatTime(attendance.check_in_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Work Mode</span>
              <span className="text-sm font-semibold">{attendance.work_mode_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Duration So Far</span>
              <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {formatMinutes(Math.floor((Date.now() - new Date(attendance.check_in_time).getTime()) / 60000))}
              </span>
            </div>
          </div>
        )}

        <button onClick={() => setStage('webcam')} className="btn-primary w-full py-3">
          Proceed to Camera Verification
        </button>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full mt-3">
          Cancel
        </button>
      </div>
    </div>
  );
}
