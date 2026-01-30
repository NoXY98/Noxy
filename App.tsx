import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { AnalysisStatus, OperaAnalysisResult } from './types';
import AnalysisDisplay from './components/AnalysisDisplay';

type InputMode = 'upload' | 'record' | 'youtube';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<OperaAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Input State
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [youtubeLink, setYoutubeLink] = useState('');
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  // Cleanup object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [recordedUrl]);

  const handleReset = () => {
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setError(null);
    setAudioFile(null);
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setYoutubeLink('');
    setInputMode('upload');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        setError("File size exceeds 20MB limit.");
        return;
      }
      setAudioFile(file);
      setError(null);
      setResult(null);
      setStatus(AnalysisStatus.IDLE);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop()); // Release mic
      };

      recorder.start();
      setRecordingTime(0);
      setIsRecording(true);
      setError(null);
      mediaRecorderRef.current = recorder;

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      setError("Microphone access denied or not supported. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleAnalyze = async () => {
    let blobToAnalyze: Blob | null = null;
    let mimeType = 'audio/mp3';

    if (inputMode === 'upload') {
      if (!audioFile) {
        setError("Please upload an audio file.");
        return;
      }
      blobToAnalyze = audioFile;
      mimeType = audioFile.type || 'audio/mp3';
    } else if (inputMode === 'record') {
      if (!recordedBlob) {
        setError("Please record some audio first.");
        return;
      }
      blobToAnalyze = recordedBlob;
      mimeType = recordedBlob.type || 'audio/webm';
    }

    if (!blobToAnalyze) return;

    setStatus(AnalysisStatus.ANALYZING);
    setError(null);

    try {
      const gemini = new GeminiService();
      const base64Data = await convertBlobToBase64(blobToAnalyze);
      const analysisResult = await gemini.analyzeAudio(base64Data, mimeType);
      setResult(analysisResult);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during analysis.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("To analyze music from YouTube (like '帝女花'), please download the audio/video file to your device first, then use the 'File Upload' section. This web app cannot download directly from YouTube due to browser security restrictions.");
  };

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6 lg:px-8 font-sans">
      <header className="py-12 text-center">
        <h1 className="text-6xl font-display text-opera-red mb-2 tracking-wider">OperaDNA</h1>
        <p className="text-xl font-serif text-gray-600 italic">Traditional Chinese Opera Analyzer</p>
      </header>

      <main className="max-w-5xl mx-auto">
        
        {/* Main Interaction Card */}
        {status !== AnalysisStatus.SUCCESS && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-12 animate-fade-in transition-all duration-500">
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-4 text-center font-serif font-bold transition-colors flex items-center justify-center gap-2 ${inputMode === 'upload' ? 'bg-opera-paper text-opera-red border-b-2 border-opera-red' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload File
              </button>
              <button 
                onClick={() => setInputMode('record')}
                className={`flex-1 py-4 text-center font-serif font-bold transition-colors flex items-center justify-center gap-2 ${inputMode === 'record' ? 'bg-opera-paper text-opera-red border-b-2 border-opera-red' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                Record Audio
              </button>
              <button 
                onClick={() => setInputMode('youtube')}
                className={`flex-1 py-4 text-center font-serif font-bold transition-colors flex items-center justify-center gap-2 ${inputMode === 'youtube' ? 'bg-opera-paper text-opera-red border-b-2 border-opera-red' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                YouTube
              </button>
            </div>

            <div className="p-8 md:p-12 min-h-[300px] flex flex-col justify-center">
              
              {/* --- MODE: UPLOAD --- */}
              {inputMode === 'upload' && (
                <div className="space-y-6 max-w-lg mx-auto w-full">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors relative group">
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="space-y-4 pointer-events-none group-hover:scale-105 transition-transform duration-300">
                      <div className="w-16 h-16 bg-opera-paper rounded-full flex items-center justify-center mx-auto text-opera-red">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                      </div>
                      <div>
                        <p className="text-gray-700 font-bold text-lg">{audioFile ? audioFile.name : "Drop Audio File Here"}</p>
                        <p className="text-sm text-gray-400 mt-1">MP3, WAV, M4A (Max 20MB)</p>
                      </div>
                    </div>
                  </div>
                  
                  {audioFile && (
                     <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center text-sm font-medium animate-pulse">
                        Ready to analyze
                     </div>
                  )}
                </div>
              )}

              {/* --- MODE: RECORD --- */}
              {inputMode === 'record' && (
                <div className="text-center space-y-8 max-w-lg mx-auto w-full">
                  <div className="relative">
                    {!isRecording && !recordedBlob && (
                      <button 
                        onClick={startRecording}
                        className="w-24 h-24 rounded-full bg-opera-red hover:bg-red-700 text-white shadow-xl transition-transform hover:scale-110 flex items-center justify-center mx-auto"
                      >
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </button>
                    )}

                    {isRecording && (
                      <div className="space-y-4">
                         <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto relative">
                            <span className="absolute w-full h-full rounded-full border-4 border-red-500 animate-ping opacity-20"></span>
                            <span className="text-3xl font-mono text-red-600 font-bold">{formatTime(recordingTime)}</span>
                         </div>
                         <button 
                          onClick={stopRecording}
                          className="px-8 py-2 bg-gray-800 text-white rounded-full hover:bg-black font-bold"
                        >
                          Stop Recording
                        </button>
                        <p className="text-sm text-gray-500 animate-pulse">Listening...</p>
                      </div>
                    )}

                    {recordedBlob && !isRecording && (
                      <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                           <audio src={recordedUrl!} controls className="w-full" />
                        </div>
                        <button 
                          onClick={() => { setRecordedBlob(null); setRecordedUrl(null); }}
                          className="text-gray-500 hover:text-red-600 text-sm underline"
                        >
                          Discard and Record Again
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- MODE: YOUTUBE --- */}
              {inputMode === 'youtube' && (
                <div className="space-y-6 max-w-lg mx-auto w-full opacity-90">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3 text-yellow-800 text-sm">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p>Browser security prevents direct YouTube downloads. Please download the audio separately and use the "Upload File" tab.</p>
                  </div>
                  <form onSubmit={handleYoutubeSubmit} className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Paste YouTube URL..." 
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opera-gold outline-none"
                    />
                    <button 
                      type="submit"
                      className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-black transition-colors"
                    >
                      Fetch Video Info
                    </button>
                  </form>
                </div>
              )}

              {/* ACTION BUTTON */}
              {(audioFile || recordedBlob) && !isRecording && status !== AnalysisStatus.ANALYZING && (
                <div className="mt-8 text-center">
                  <button 
                    onClick={handleAnalyze}
                    className="px-12 py-4 bg-opera-red text-white text-lg rounded-full font-bold shadow-lg hover:bg-red-900 transition-all transform hover:-translate-y-1 hover:shadow-2xl flex items-center justify-center gap-3 mx-auto"
                  >
                    <span>Analyze Audio</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded shadow-sm animate-shake" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {status === AnalysisStatus.ANALYZING && (
          <div className="p-12 text-center bg-white rounded-xl shadow-xl">
            <div className="relative w-20 h-20 mx-auto mb-6">
               <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-opera-red rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-2xl font-serif text-opera-red mb-2">Consulting the Maestro...</h3>
            <p className="text-gray-500">Identifying instruments and rhythmic patterns.</p>
          </div>
        )}

        {/* Results Section */}
        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-8">
            <AnalysisDisplay result={result} />
            <div className="text-center">
              <button 
                onClick={handleReset}
                className="px-8 py-3 bg-white border-2 border-opera-gold text-opera-gold rounded-full font-bold hover:bg-opera-gold hover:text-white transition-colors shadow-md flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Analyze Another
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;