import React from 'react';
import { OperaAnalysisResult } from '../types';

interface AnalysisDisplayProps {
  result: OperaAnalysisResult;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header Result */}
      <div className="bg-white border-t-4 border-opera-red shadow-xl rounded-b-lg p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-opera-gold"></div>
        <div className="uppercase tracking-widest text-gray-500 text-sm mb-2">Detected Genre</div>
        <h2 className="text-5xl font-display text-opera-red mb-4">{result.genre}</h2>
        <div className="inline-block px-4 py-1 bg-opera-gold/20 text-opera-red rounded-full text-sm font-semibold">
          Confidence: {result.confidence}%
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reasoning Card */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-opera-gold">
          <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🧐</span> Musical Reasoning
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {result.reasoning}
          </p>
        </div>

        {/* Cultural Context Card */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-700">
          <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📜</span> Cultural Context
          </h3>
          <p className="text-gray-700 leading-relaxed italic">
            "{result.culturalContext}"
          </p>
        </div>
      </div>

      {/* Bangu Sheet Music */}
      <div className="bg-opera-black text-opera-paper p-8 rounded-lg shadow-2xl font-mono relative">
        <div className="absolute top-4 right-4 text-opera-gold text-xs border border-opera-gold px-2 py-1 rounded">
          BAN (CLAPPER) & GU (DRUM)
        </div>
        <h3 className="font-serif text-xl font-bold mb-6 text-opera-gold">Bangu Percussion Score</h3>
        <div className="bg-gray-900/50 p-6 rounded border border-gray-700 overflow-x-auto">
          <pre className="text-lg leading-loose tracking-widest whitespace-pre font-mono">
            {result.banguScore}
          </pre>
        </div>
        <div className="mt-4 text-xs text-gray-500 flex flex-wrap gap-4">
          <span>Key:</span>
          <span><strong className="text-white">X</strong> = Ban/Clapper</span>
          <span><strong className="text-white">D</strong> = Du/Hard</span>
          <span><strong className="text-white">d</strong> = da/Soft</span>
          <span><strong className="text-white">k</strong> = Kuang/Gong</span>
          <span><strong className="text-white">.</strong> = Rest</span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;