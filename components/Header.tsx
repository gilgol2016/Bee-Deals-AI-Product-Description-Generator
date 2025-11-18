import React from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import { CopyIcon } from './icons/CopyIcon';
import { DebugIcon } from './icons/DebugIcon';
import { GeneratedContent } from '../types';

interface HeaderProps {
  userInput: string;
  setUserInput: (input: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  generatedContent: GeneratedContent | null;
  onCopy: (format: 'markdown' | 'html') => void;
  onDownload: () => void;
  showDebugLog: boolean;
  setShowDebugLog: (show: boolean) => void;
  onClear: () => void;
  onReset: () => void;
  isClearDisabled: boolean;
  isResetDisabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  userInput,
  setUserInput,
  onGenerate,
  isLoading,
  generatedContent,
  onCopy,
  onDownload,
  showDebugLog,
  setShowDebugLog,
  onClear,
  onReset,
  isClearDisabled,
  isResetDisabled,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onGenerate();
    }
  };
  
  const isGenerateDisabled = isLoading || !userInput.trim();

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
        <div className="flex-grow w-full flex gap-2 items-start">
          <div className="relative flex-grow">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a product URL, HTML code, or plain text..."
              className="w-full h-24 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-y"
              disabled={isLoading}
            />
          </div>

          <button
            onClick={onReset}
            disabled={isResetDisabled}
            className="px-6 py-2 bg-white text-gray-800 font-semibold rounded-md border border-gray-300 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClear}
            disabled={isClearDisabled}
            className="px-6 py-2 bg-white text-gray-800 font-semibold rounded-md border border-gray-300 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerateDisabled}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
          >
            {isLoading ? '...' : 'Generate'}
          </button>
        </div>
        
        <div className="w-full flex justify-end items-center">
            <div className="flex items-center gap-2">
                {generatedContent && (
                  <>
                    <button onClick={() => onCopy('markdown')} className="p-2 border rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2" title="Copy All (Markdown)"> <CopyIcon className="h-5 w-5" /> <span className="hidden lg:inline">MD</span></button>
                    <button onClick={() => onCopy('html')} className="p-2 border rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2" title="Copy All (HTML)"> <CopyIcon className="h-5 w-5" /> <span className="hidden lg:inline">HTML</span></button>
                    <button onClick={onDownload} className="p-2 border rounded-md hover:bg-gray-100 transition-colors" title="Download as HTML"> <DownloadIcon className="h-5 w-5" /></button>
                  </>
                )}
                <button onClick={() => setShowDebugLog(!showDebugLog)} className={`p-2 border rounded-md hover:bg-gray-100 transition-colors ${showDebugLog ? 'bg-blue-100 text-blue-700' : ''}`} title="Toggle Debug Log"><DebugIcon className="h-5 w-5" /></button>
            </div>
        </div>
      </div>
    </header>
  );
};