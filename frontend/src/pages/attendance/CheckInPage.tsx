import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import WebcamCapture from '../../components/webcam/WebcamCapture';
import { WorkMode } from '../../types';
import toast from 'react-hot-toast';
import { formatTime } from '../../utils/format';

type Stage = 'mode_select' | 'webcam' | 'success';

export default function CheckInPage() {
  const navigate = useNavigate();
  const [workModes, setWorkModes] = useState<WorkMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<WorkMode | null>(null);
  const [stage, setStage] = useState<Stage>('mode_select');
  const [isUploading, setIsUploading] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');

  useEffect(() => {
    api.get('/work-modes').then((r) => setWorkModes(r.data.data || []));
    // Check if already checked in
    api.get('/attendance/today').then((r) => {
      if (r.data.data?.attendance?.status === 'CHECKED_IN') {
        toast('You are already checked in today', { icon: 'ℹ️' });
        navigate('/dashboard');
      }
    }).catch(() => {});
  }, []);

  const handleCapture = async (file: File) => {
    if (!selectedMode) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('selfie', file);
      formData.append('work_mode_id', String(selectedMode.id));
      const res = await api.post('/attendance/check-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCheckInTime(formatTime(res.data.data.attendance.check_in_time));
      setStage('success');
      toast.success('Check-in successful!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Check-in failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const modeIcons: Record<string, string> = { OFFICE: '🏢', WFH: '🏠', HYBRID: '🔄' };

  if (stage === 'success') {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-In Successful!</h2>
        <p className="text-gray-500 mb-2">You checked in at <span className="font-bold text-gray-900">{checkInTime}</span></p>
        <p className="text-gray-500 mb-8">Work mode: <span className="font-semibold">{selectedMode?.name}</span></p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
          <button onClick={() => navigate('/timesheet/new')} className="btn-secondary">
            Add Timesheet
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'webcam') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-6">
          <h2 className="section-title mb-1">Attendance Verification</h2>
          <p className="text-sm text-gray-500 mb-6">Work mode: <strong>{selectedMode?.name}</strong></p>
          <WebcamCapture
            onCapture={handleCapture}
            onCancel={() => setStage('mode_select')}
            isUploading={isUploading}
          />
        </div>
      </div>
    );
  }

  // Mode selection
  return (
    <div className="max-w-lg mx-auto">
      <div className="card p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check In</h2>
        <p className="text-gray-500 text-sm mb-8">Select your work mode for today, then capture a selfie to verify your attendance.</p>

        <div className="space-y-3 mb-8">
          {workModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                selectedMode?.id === mode.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-3xl">{modeIcons[mode.code] || '💼'}</span>
              <div>
                <p className="font-semibold text-gray-900">{mode.name}</p>
                {mode.description && <p className="text-sm text-gray-500">{mode.description}</p>}
              </div>
              {selectedMode?.id === mode.id && (
                <CheckCircleIcon className="h-5 w-5 text-blue-600 ml-auto" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setStage('webcam')}
          disabled={!selectedMode}
          className="btn-primary w-full py-3"
        >
          Continue to Camera Verification
        </button>
      </div>
    </div>
  );
}
