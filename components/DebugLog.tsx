import React, { useEffect, useRef } from 'react';

interface DebugLogProps {
  logs: string[];
  onClose: () => void;
}

export const DebugLog: React.FC<DebugLogProps> = ({ logs, onClose }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to the bottom when new logs are added
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 text-white shadow-2xl max-h-96 flex flex-col">
      <div className="flex justify-between items-center p-2 bg-gray-900 border-b border-gray-700">
        <h3 className="font-mono text-sm font-bold">DEBUG LOG</h3>
        <button
          onClick={onClose}
          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          Close
        </button>
      </div>
      <div ref={logContainerRef} className="p-4 overflow-y-auto font-mono text-xs whitespace-pre-wrap break-words">
        {logs.map((log, index) => (
          <div key={index} className={`py-1 ${log.startsWith('[') ? 'text-green-400' : 'text-gray-300'} ${!log.startsWith('[') && 'pl-4 border-l border-gray-600'}`}>
            {log}
          </div>
        ))}
        {logs.length === 0 && <p className="text-gray-500">Log is empty. Click "Generate" to see the process.</p>}
      </div>
    </div>
  );
};
