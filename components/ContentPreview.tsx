import React from 'react';
import { GeneratedContent, Language, Section } from '../types';
import { EditableCard } from './EditableCard';
import { Spinner } from './Spinner';

interface ContentPreviewProps {
  content: GeneratedContent | null;
  isLoading: boolean;
  error: string | null;
  regeneratingSections: Set<Section>;
  onUpdateContent: (section: Section, newContent: string) => void;
  onRegenerateSection: (section: Section) => void;
  sectionLanguages: { [key in Section]?: Language };
  onTranslateSection: (section: Section, language: Language) => void;
}

const SkeletonCard: React.FC<{className?: string}> = ({className}) => (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
    </div>
);


export const ContentPreview: React.FC<ContentPreviewProps> = ({
  content,
  isLoading,
  error,
  regeneratingSections,
  onUpdateContent,
  onRegenerateSection,
  sectionLanguages,
  onTranslateSection,
}) => {
  if (isLoading) {
    return (
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard className="lg:col-span-2 h-96"/>
            <SkeletonCard className="lg:col-span-2"/>
            <SkeletonCard />
            <SkeletonCard />
        </div>
    );
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;
  }
  
  if (!content) {
    return (
      <div className="p-8 text-center text-gray-500">
        <h2 className="text-xl font-semibold mb-2">Welcome to the AI Product Description Generator</h2>
        <p>Paste a product URL above and click "Generate" to get started.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {content.photo ? (
        <EditableCard
          title="Product Photo"
          content={<img src={content.photo} alt="Product" className="rounded-lg object-cover w-full h-auto" />}
          onUpdate={(newContent) => onUpdateContent('photo', newContent)}
          onRegenerate={() => onRegenerateSection('photo')}
          isRegenerating={regeneratingSections.has('photo')}
          isTextContent={false}
          className="lg:col-span-2"
          shortcutKey={1}
        />
      ) : (
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center text-gray-500">
            <h3 className="text-md font-semibold text-gray-800 mb-2">Product Photo</h3>
            <p>No photo found for this product.</p>
        </div>
      )}
      <EditableCard
        title="Header"
        content={content.header}
        onUpdate={(newContent) => onUpdateContent('header', newContent)}
        onRegenerate={() => onRegenerateSection('header')}
        isRegenerating={regeneratingSections.has('header')}
        className="lg:col-span-2"
        shortcutKey={2}
        language={sectionLanguages.header}
        onLanguageChange={(lang) => onTranslateSection('header', lang)}
      />
      <EditableCard
        title="Description"
        content={content.description}
        onUpdate={(newContent) => onUpdateContent('description', newContent)}
        onRegenerate={() => onRegenerateSection('description')}
        isRegenerating={regeneratingSections.has('description')}
        shortcutKey={3}
        language={sectionLanguages.description}
        onLanguageChange={(lang) => onTranslateSection('description', lang)}
      />
      <EditableCard
        title="Features / Specs"
        content={content.features}
        onUpdate={(newContent) => onUpdateContent('features', newContent)}
        onRegenerate={() => onRegenerateSection('features')}
        isRegenerating={regeneratingSections.has('features')}
        shortcutKey={4}
        language={sectionLanguages.features}
        onLanguageChange={(lang) => onTranslateSection('features', lang)}
      />
      {content.reviews && (
        <EditableCard
          title="Reviews"
          content={content.reviews}
          onUpdate={(newContent) => onUpdateContent('reviews', newContent)}
          onRegenerate={() => onRegenerateSection('reviews')}
          isRegenerating={regeneratingSections.has('reviews')}
          className="lg:col-span-2"
          shortcutKey={5}
          language={sectionLanguages.reviews}
          onLanguageChange={(lang) => onTranslateSection('reviews', lang)}
        />
      )}
    </div>
  );
};