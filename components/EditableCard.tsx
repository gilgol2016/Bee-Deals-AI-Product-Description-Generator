import React, { useState, useEffect, useRef } from 'react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { CopyIcon } from './icons/CopyIcon';
import { EditIcon } from './icons/EditIcon';
import { RegenerateIcon } from './icons/RegenerateIcon';
import { Spinner } from './Spinner';
import { Language } from '../types';
import { TranslateIcon } from './icons/TranslateIcon';

interface EditableCardProps {
  title: string;
  content: React.ReactNode;
  onUpdate: (newContent: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  isTextContent?: boolean;
  className?: string;
  shortcutKey: number;
  language?: Language;
  onLanguageChange?: (newLang: Language) => void;
}

export const EditableCard: React.FC<EditableCardProps> = ({
  title,
  content,
  onUpdate,
  onRegenerate,
  isRegenerating,
  isTextContent = true,
  className,
  shortcutKey,
  language,
  onLanguageChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(typeof content === 'string' ? content : '');
  const [copy, copyStatus] = useCopyToClipboard();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof content === 'string') {
        setEditedContent(content);
    }
  }, [content]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if(editedContent.trim() !== (content as string).trim()) {
        onUpdate(editedContent);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
    }
    if (e.key === 'Escape') {
        setIsEditing(false);
        setEditedContent(content as string);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const copyContent = () => {
    if (typeof content === 'string') {
      copy(content);
    }
  };

  const toggleEdit = () => {
    if (isTextContent) {
        setIsEditing(!isEditing);
    }
  };
  
  return (
    <div className={`group relative bg-white border border-gray-200 rounded-lg shadow-sm p-6 transition-shadow hover:shadow-md ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
            {title}
            {language && <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{language === 'English' ? 'EN' : 'HE'}</span>}
        </h3>
        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onRegenerate} disabled={isRegenerating} title={`Regenerate (Ctrl+${shortcutKey})`} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50"><RegenerateIcon className="h-4 w-4" /></button>
            {isTextContent && language && onLanguageChange && (
                 <button
                    onClick={() => onLanguageChange(language === 'English' ? 'Hebrew' : 'English')}
                    disabled={isRegenerating}
                    title={`Translate to ${language === 'English' ? 'Hebrew' : 'English'}`}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50"
                 >
                    <TranslateIcon className="h-4 w-4" />
                 </button>
            )}
            {isTextContent && <button onClick={copyContent} title="Copy" className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"><CopyIcon className="h-4 w-4" /></button>}
            {isTextContent && <button onClick={toggleEdit} title="Edit" className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"><EditIcon className="h-4 w-4" /></button>}
        </div>
      </div>
      
      {isRegenerating ? (
        <div className="flex items-center justify-center h-24"><Spinner /></div>
      ) : (
        <div className="text-gray-600 prose prose-sm max-w-none">
          {isEditing && isTextContent ? (
            <textarea
              ref={inputRef}
              value={editedContent}
              onChange={handleInputChange}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full p-2 border border-blue-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          ) : (
            <div onClick={toggleEdit} className={isTextContent ? "cursor-pointer" : ""}>
                {typeof content === 'string' ? <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div> : content}
            </div>
          )}
        </div>
      )}

      {copyStatus === 'copied' && (
        <div className="absolute bottom-4 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md">
          Copied!
        </div>
      )}
    </div>
  );
};