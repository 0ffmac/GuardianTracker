"use client";

import React, { useState } from 'react';
import { AlertTriangle, Mic, MicOff, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AlertButtonProps {
  variant?: 'emergency' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AlertButton: React.FC<AlertButtonProps> = ({ 
  variant = 'emergency', 
  size = 'md',
  className = '' 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const router = useRouter();

  const buttonStyles = {
    emergency: 'bg-red-600 hover:bg-red-700 text-white border-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500',
  };

  const sizeClasses = {
    sm: 'p-2 rounded-lg',
    md: 'p-3 rounded-xl',
    lg: 'p-4 rounded-2xl',
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      setRecorder(mediaRecorder);
      
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      // Stop timer when recording stops
      mediaRecorder.addEventListener('stop', () => {
        clearInterval(timer);
      });
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please ensure you have granted permission.');
    }
  };

  const handleStopRecording = () => {
    if (recorder && mediaStream) {
      recorder.stop();
      
      // Stop all tracks to properly end the recording
      mediaStream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      setMediaStream(null);
      setRecorder(null);
    }
  };

  const handleTriggerAlert = async () => {
    try {
      let audioUrl = null;
      
      // If there's recorded audio, we need to upload it first
      if (audioBlob) {
        // In a real implementation, we'd upload to a storage service
        // For now, we'll create a data URL as a placeholder
        audioUrl = URL.createObjectURL(audioBlob);
      }

      const response = await fetch('/api/alerts/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: variant === 'emergency' ? 'Emergency Alert' : 'Alert',
          description: `Help needed. ${audioUrl ? 'Audio message attached.' : ''}`
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Alert triggered successfully:', result);
        
        // Redirect to dashboard or show success message
        setShowConfirm(false);
        router.push('/dashboard');
      } else {
        const error = await response.json();
        console.error('Error triggering alert:', error);
        alert('Error sending alert: ' + error.error);
      }
    } catch (error) {
      console.error('Error triggering alert:', error);
      alert('Error sending alert. Please try again.');
    }
  };

  const handleConfirm = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setShowConfirm(true);
  };

  const handleCancel = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setShowConfirm(false);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  return (
    <div className="relative">
      {showConfirm && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-80 bg-surface backdrop-blur-sm rounded-2xl border border-white/20 p-6 z-50 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-white">Confirm Alert</h3>
            <button 
              onClick={handleCancel}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-gray-300 mb-4">
            {variant === 'emergency' 
              ? 'This will send an emergency alert to your trusted contacts.' 
              : 'This will send an alert to your trusted contacts.'}
          </p>
          
          {audioBlob && (
            <div className="mb-4 p-3 bg-black/30 rounded-lg">
              <p className="text-sm text-green-400 mb-2">Audio message recorded</p>
              <audio controls className="w-full">
                  <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                  Your browser does not support the audio element.
              </audio>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTriggerAlert}
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Alert
            </button>
          </div>
        </div>
      )}
      
      <button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        className={`
          ${buttonStyles[variant]} 
          ${sizeClasses[size]} 
          border 
          flex items-center justify-center 
          transition-all duration-300 
          shadow-lg
          ${isRecording ? 'animate-pulse' : ''}
          ${className}
        `}
        aria-label={isRecording ? "Stop recording" : "Trigger alert"}
      >
        {isRecording ? (
          <>
            <MicOff className="w-6 h-6" />
            <span className="ml-2 text-sm">{recordingTime}s</span>
          </>
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>
      
      {!isRecording && !showConfirm && (
        <button
          onClick={handleConfirm}
          className={`
            ${buttonStyles[variant]} 
            ${sizeClasses[size]} 
            border 
            flex items-center justify-center 
            transition-all duration-300 
            shadow-lg
            absolute -bottom-2 -right-2
            bg-red-700 border-red-600
            w-8 h-8 rounded-full
          `}
          aria-label="Confirm alert"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default AlertButton;