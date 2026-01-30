import React, { useState } from 'react';
import { GeminiService } from './services/geminiService';
import { AnalysisStatus, OperaAnalysisResult } from './types';
import AnalysisDisplay from './components/AnalysisDisplay';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<OperaAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [youtubeLink, setYoutubeLink] = useState('');

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

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (!audioFile) {
      setError("Please upload an audio file.");
      return;
    }

    setStatus(AnalysisStatus.ANALYZING);
    setError(null);

    try {
      const gemini = new GeminiService();
      const base64Data = await convertFileToBase64(audioFile);
      const mimeType = audioFile.type || 'audio/mp3'; // Default fallback

      const analysisResult = await gemini.analyzeAudio(base64Data, mimeType);
      setResult(analysisResult);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during analysis.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  // Note: Client-side YouTube extraction is not possible due to CORS.
  // This function simulates the validation required by the prompt.
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
        <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-12">
          {/* Input Section */}
          <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              
              {/* File Upload Column */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-opera-red text-white flex items-center justify-center font-bold">1</div>
                  <h3 className="text-xl font-bold text-gray-800">File Upload</h3>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-gray-600 font-medium">{audioFile ? audioFile.name : "Drop MP3/WAV here"}</p>
                    <p className="text-xs text-gray-400">Max 20MB</p>
                  </div>
                </div>

                {audioFile && status !== AnalysisStatus.ANALYZING && status !== AnalysisStatus.SUCCESS && (
                  <button 
                    onClick={handleAnalyze}
                    className="w-full py-3 bg-opera-red text-white rounded-lg font-bold shadow-lg hover:bg-red-900 transition-all transform hover:-translate-y-1"
                  >
                    Analyze Audio
                  </button>
                )}
              </div>

              {/* YouTube Column (Informational/Mock) */}
              <div className="space-y-6 opacity-80">
                 <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center font-bold">2</div>
                  <h3 className="text-xl font-bold text-gray-800">YouTube Link</h3>
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
                    Fetch Video
                  </button>
                  <p className="text-xs text-gray-500 italic">
                    *Note: This feature requires a Python backend (yt_dlp). Please use File Upload for this React demo.
                  </p>
                </form>
              </div>

            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-8" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {status === AnalysisStatus.ANALYZING && (
            <div className="p-12 text-center bg-opera-paper/50">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-opera-red mx-auto mb-4"></div>
              <h3 className="text-xl font-serif text-opera-red">Consulting the Maestro...</h3>
              <p className="text-gray-500">Identifying instruments and rhythmic patterns.</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {status === AnalysisStatus.SUCCESS && result && (
          <AnalysisDisplay result={result} />
        )}

      </main>
    </div>
  );
};

export default App;
