"use client";

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Send, Play, Pause } from 'lucide-react';

interface AudioRecorderProps {
  alertId: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ alertId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const stopRecording = () => {
    if (recorder && mediaStream) {
      recorder.stop();
      
      // Stop all tracks to properly end the recording
      mediaStream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      setMediaStream(null);
      setRecorder(null);
      setRecordingTime(0);
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    setUploading(true);

    try {
      // In a real application, you would upload the audio file to a cloud storage service
      // For this demo, we'll use a placeholder URL that represents where the audio would be stored
      const placeholderUrl = `/audio/alert_response_${alertId}_${Date.now()}.webm`;

      // Now send the audio message to the API
      const response = await fetch(`/api/alerts/${alertId}/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentUrl: placeholderUrl, // In a real app, this would be the URL to the uploaded file
          contentType: 'audio/webm',
          duration: recordingTime
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Audio message sent successfully:', result);
        setAudioBlob(null);
        alert('Audio message sent successfully!');
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
              src={URL.createObjectURL(audioBlob)} 
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