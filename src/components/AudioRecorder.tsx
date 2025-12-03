"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Play, Pause } from 'lucide-react';

interface AudioRecorderProps {
  alertId: string;
  onSent?: () => void;
}
 
const AudioRecorder: React.FC<AudioRecorderProps> = ({ alertId, onSent }) => {

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
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
        setIsRecording(false);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (recorder && mediaStream) {
      recorder.stop();

      // Stop all tracks to properly end the recording
      mediaStream.getTracks().forEach(track => track.stop());

      setMediaStream(null);
      setRecorder(null);
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Error playing audio:", e));
      }
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    setUploading(true);

    try {
      // Create FormData to send the actual audio file
      const formData = new FormData();
      formData.append('audioFile', audioBlob, `alert_response_${Date.now()}.webm`);
      formData.append('contentType', 'audio/webm');
      formData.append('duration', recordingTime.toString());
      formData.append('alertId', alertId);

      // Send using multipart/form-data for the actual file upload
      const response = await fetch(`/api/alerts/${alertId}/audio`, {
        method: 'POST',
        body: formData, // Send the actual file data
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Audio message sent successfully:', result);
        setAudioBlob(null);
        alert('Audio message sent successfully!');
        if (onSent) {
          onSent();
        }
      } else {
        const error = await response.json();
        console.error('Error sending audio:', error);
        alert('Error sending audio: ' + error.error);
      }
    } catch (error) {
      console.error('Error sending audio:', error);
      alert('Error sending audio: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Effect to handle audio element source when audioBlob changes
  useEffect(() => {
    if (audioRef.current && audioBlob) {
      audioRef.current.src = URL.createObjectURL(audioBlob);
    }

    // Clean up object URLs
    return () => {
      if (audioRef.current) {
        audioRef.current.src = '';
      }
    };
  }, [audioBlob]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`
            p-2 rounded-lg flex items-center justify-center
            ${isRecording
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'}
          `}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4" />
              <span className="ml-1 text-xs">{recordingTime}s</span>
            </>
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {audioBlob && (
          <>
            <button
              onClick={handlePlay}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={handleSend}
              disabled={uploading}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
              aria-label="Send audio"
            >
              <Send className="w-4 h-4" />
              {uploading ? 'Sending...' : 'Send'}
            </button>

            <audio
              ref={audioRef}
              onEnded={() => setIsPlaying(false)}
              preload="metadata"
            />
          </>
        )}
      </div>

      {audioBlob && (
        <p className="text-xs text-gray-400">
          Recorded: {recordingTime}s • {Math.round(audioBlob.size / 1024)} KB
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;