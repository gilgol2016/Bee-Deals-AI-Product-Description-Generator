import React from 'react';

export const DebugIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2.143 2.143 0 00-1.828-1.828a2.143 2.143 0 00-1.828 1.828a2.143 2.143 0 001.828 1.828a2.143 2.143 0 001.828-1.828z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v4M12 16h.01" />
    </svg>
);
