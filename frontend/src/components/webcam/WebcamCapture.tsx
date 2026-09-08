import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  CameraIcon, ArrowPathIcon, CheckIcon, XMarkIcon,
  ExclamationTriangleIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onCancel?: () => void;
  isUploading?: boolean;
}

type Stage = 'privacy' | 'requesting' | 'preview' | 'captured' | 'error';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

export default function WebcamCapture({ onCapture, onCancel, isUploading = false }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>('privacy');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Stop camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // KEY FIX: Once the 'preview' stage renders the <video> element,
  // bind the stream to it. This runs AFTER React renders the video element into the DOM.
  useEffect(() => {
    if (stage === 'preview' && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(() => {
        // Some browsers throw if play is interrupted — safe to ignore
      });
    }
  }, [stage]); // re-runs whenever stage changes to 'preview'

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setStage('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: CANVAS_WIDTH },
          height: { ideal: CANVAS_HEIGHT },
        },
        audio: false,
      });

      // Store the stream ref BEFORE changing stage so the useEffect can pick it up
      streamRef.current = stream;
      setStage('preview'); // triggers the useEffect above to bind stream → video
    } catch (err) {
      stopCamera();
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera was found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setErrorMessage('Camera is in use by another application. Please close other apps and try again.');
      } else {
        setErrorMessage(`Camera error: ${error.message || 'Unknown error'}`);
      }
      setStage('error');
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx.drawImage(videoRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMessage('Failed to capture image. Please try again.');
          return;
        }

        const doCapture = (b: Blob) => {
          const file = new File([b], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedFile(file);
          setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.85));
          stopCamera();
          setStage('captured');
        };

        if (blob.size > MAX_FILE_SIZE) {
          canvas.toBlob(
            (smallBlob) => {
              if (!smallBlob) { setErrorMessage('Image is too large. Please try again.'); return; }
              doCapture(smallBlob);
            },
            'image/jpeg',
            0.6
          );
        } else {
          doCapture(blob);
        }
      },
      'image/jpeg',
      0.85
    );
  }, []);

  const retake = () => {
    setCapturedDataUrl(null);
    setCapturedFile(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedFile) onCapture(capturedFile);
  };

  // ─── Privacy Notice ──────────────────────────────────────────────────────────
  if (stage === 'privacy') {
    return (
      <div className="flex flex-col items-center p-6 max-w-md mx-auto">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Verification</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800 leading-relaxed">
          <p className="font-semibold mb-2">Privacy Notice</p>
          <p>
            Your webcam will be used to capture an attendance verification selfie.
            The image will be stored securely according to organizational attendance
            and privacy policies. The camera is only active during this check-in/check-out
            process and will be turned off immediately after capture.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
          )}
          <button onClick={startCamera} className="btn-primary flex-1">
            <CameraIcon className="h-4 w-4" />
            Allow Camera
          </button>
        </div>
      </div>
    );
  }

  // ─── Requesting permission ───────────────────────────────────────────────────
  if (stage === 'requesting') {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">Requesting camera access…</p>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="flex flex-col items-center p-6 max-w-md mx-auto">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <ExclamationTriangleIcon className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">Camera Unavailable</h3>
        <p className="text-sm text-gray-600 text-center mb-6">{errorMessage}</p>
        <div className="flex gap-3">
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          )}
          <button onClick={() => setStage('privacy')} className="btn-primary">
            <ArrowPathIcon className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Live camera preview ─────────────────────────────────────────────────────
  if (stage === 'preview') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-xl overflow-hidden bg-black w-full max-w-md aspect-video">
          {/* 
            autoPlay + muted + playsInline are required attributes.
            The actual srcObject binding happens in the useEffect above,
            after this element is mounted in the DOM.
          */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <div className="absolute inset-0 border-4 border-blue-500/40 rounded-xl pointer-events-none" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
            Center your face in the frame
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-3 w-full max-w-md">
          {onCancel && (
            <button
              onClick={() => { stopCamera(); onCancel(); }}
              className="btn-secondary flex-1"
            >
              <XMarkIcon className="h-4 w-4" />
              Cancel
            </button>
          )}
          <button onClick={capturePhoto} className="btn-primary flex-1 py-3">
            <CameraIcon className="h-5 w-5" />
            Capture Photo
          </button>
        </div>
      </div>
    );
  }

  // ─── Review captured photo ───────────────────────────────────────────────────
  if (stage === 'captured' && capturedDataUrl) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-xl overflow-hidden w-full max-w-md aspect-video bg-gray-100">
          <img src={capturedDataUrl} alt="Captured selfie" className="w-full h-full object-cover" />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 text-white">
              <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Uploading…</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600">Review your photo. Make sure your face is clearly visible.</p>
        <div className="flex gap-3 w-full max-w-md">
          <button onClick={retake} disabled={isUploading} className="btn-secondary flex-1">
            <ArrowPathIcon className="h-4 w-4" />
            Retake
          </button>
          <button onClick={confirm} disabled={isUploading} className="btn-primary flex-1 py-3">
            <CheckIcon className="h-5 w-5" />
            {isUploading ? 'Uploading…' : 'Confirm & Submit'}
          </button>
        </div>
        {capturedFile && (
          <p className="text-xs text-gray-400">
            File size: {(capturedFile.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
    );
  }

  return null;
}
