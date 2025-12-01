"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mic, MicOff, Send, X, Play, Pause, Volume2 } from 'lucide-react';
import AudioRecorder from './AudioRecorder';

interface Alert {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  audioMessages: AudioMessage[];
  recipientStatus?: string;
  recipientNotifiedAt?: string;
  recipientRespondedAt?: string;
  recipients?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    status: string;
    notifiedAt: string | null;
    respondedAt: string | null;
  }[];
}

interface AudioMessage {
  id: string;
  contentUrl: string;
  contentType: string;
  duration: number | null;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface AlertListProps {
  alerts: Alert[];
  onRespond?: (alertId: string, action: string) => void;
  onSendMessage?: (alertId: string, message: string) => void;
  showActions?: boolean;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onRespond, onSendMessage, showActions = true }) => {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [audioStates, setAudioStates] = useState<Record<string, { isPlaying: boolean; audioRef: HTMLAudioElement | null }>>({});

  const toggleAlert = (alertId: string) => {
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  const handleAudioPlay = (audioId: string, url: string) => {
    // Stop any currently playing audio
    Object.entries(audioStates).forEach(([id, state]) => {
      if (state.isPlaying && state.audioRef) {
        state.audioRef.pause();
      }
    });

    // If this audio is already playing, pause it
    if (audioStates[audioId]?.isPlaying && audioStates[audioId]?.audioRef) {
      audioStates[audioId].audioRef.pause();
      setAudioStates(prev => ({
        ...prev,
        [audioId]: { isPlaying: false, audioRef: audioStates[audioId].audioRef }
      }));
      return;
    }

    // Create new audio element and play
    const audio = new Audio(url);
    audio.play().then(() => {
      setAudioStates(prev => ({
        ...prev,
        [audioId]: { isPlaying: true, audioRef: audio }
      }));

      audio.onended = () => {
        setAudioStates(prev => ({
          ...prev,
          [audioId]: { isPlaying: false, audioRef: null }
        }));
      };
    }).catch(err => {
      console.error('Error playing audio:', err);
    });
  };

  const handleRespond = (alertId: string, action: 'dismiss' | 'acknowledge' | 'read') => {
    if (onRespond) {
      onRespond(alertId, action);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto text-gray-600 mb-2" />
          <p>No alerts found</p>
        </div>
      ) : (
        alerts.map(alert => (
          <div 
            key={alert.id} 
            className={`bg-surface backdrop-blur-sm rounded-2xl border p-4 transition-all duration-300 ${
              alert.status === 'ACTIVE' ? 'border-red-500/30' : 'border-white/20'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-5 h-5 ${alert.status === 'ACTIVE' ? 'text-red-400' : 'text-yellow-400'}`} />
                  <h3 className="font-semibold text-white">{alert.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    alert.status === 'ACTIVE' 
                      ? 'bg-red-900/40 text-red-300' 
                      : alert.status === 'RESOLVED'
                      ? 'bg-green-900/40 text-green-300'
                      : 'bg-yellow-900/40 text-yellow-300'
                  }`}>
                    {alert.status}
                  </span>
                </div>
                
                {alert.description && (
                  <div className="mb-3 p-3 bg-black/30 rounded-lg">
                    <p className="text-gray-300 text-sm">{alert.description}</p>
                  </div>
                )}
                
                <div className="text-xs text-gray-400 mb-3">
                  From: {alert.user.name || alert.user.email} • {formatTime(alert.createdAt)}
                </div>
                
                {alert.audioMessages.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Audio Messages:</h4>
                    <div className="space-y-2">
                      {alert.audioMessages.map(audio => (
                        <div key={audio.id} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                          <button
                            onClick={() => handleAudioPlay(audio.id, audio.contentUrl)}
                            className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                            aria-label={audioStates[audio.id]?.isPlaying ? "Pause" : "Play"}
                          >
                            {audioStates[audio.id]?.isPlaying ? (
                              <Pause className="w-4 h-4 text-white" />
                            ) : (
                              <Play className="w-4 h-4 text-white" />
                            )}
                          </button>
                          <span className="text-xs text-gray-300">
                            {audio.sender.name || audio.sender.email} - {formatTime(audio.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {expandedAlert === alert.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    {alert.recipients && alert.recipients.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-1">Recipients</p>
                        <ul className="space-y-1 text-xs text-gray-300">
                          {alert.recipients.map((recipient) => (
                            <li key={recipient.id} className="flex justify-between gap-2">
                              <span className="truncate">{recipient.name || recipient.email}</span>
                              <span className="text-gray-400">{recipient.status}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {showActions && (
                      <>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleRespond(alert.id, "read")}
                            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Mark as Read
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Do you want to acknowledge this alert?")) {
                                handleRespond(alert.id, "acknowledge");
                              }
                            }}
                            className="px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                          >
                            Acknowledge Alert
                          </button>
                          <button
                            onClick={() => handleRespond(alert.id, "dismiss")}
                            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            Dismiss Alert
                          </button>
                        </div>

                        {/* Audio Recording Interface */}
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400 mb-2">Send audio response:</p>
                          <AudioRecorder alertId={alert.id} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => toggleAlert(alert.id)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                {expandedAlert === alert.id ? <X className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AlertList;