import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ContentPreview } from './components/ContentPreview';
import { CustomizationOptions, GeneratedContent, ScrapedProductData, Section, ScrapeMode, Language, OutputLanguage } from './types';
import { scrapeUrl, parseHtmlContent, parseTextContent } from './services/scrapingService';
import { generateAllContent, regenerateSectionContent, translateContent } from './services/geminiService';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import { DebugLog } from './components/DebugLog';

const detectInputType = (input: string): ScrapeMode => {
    const trimmedInput = input.trim();
    
    // Check for HTML: Look for common tags like <html>, <!DOCTYPE, or <body>
    const isHtml = /<html|<!DOCTYPE/i.test(trimmedInput);
    if (isHtml) {
        return 'html';
    }

    // Check for URL: Should start with http/https and be a single line without spaces
    const isUrl = /^https?:\/\/\S+$/.test(trimmedInput);
    if (isUrl) {
        return 'auto'; // 'auto' mode handles URLs
    }

    // Default to text
    return 'text';
};

const defaultOptions: CustomizationOptions = {
  tone: 'Formal',
  length: 'Auto',
  emojis: 'No',
};

const initialSectionLanguages: { [key in Section]?: Language } = {
  header: 'English',
  description: 'English',
  features: 'English',
  reviews: 'English',
};


const App: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<ScrapedProductData | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [regeneratingSections, setRegeneratingSections] = useState<Set<Section>>(new Set());
  const [copy, copyStatus] = useCopyToClipboard();
  const [toastMessage, setToastMessage] = useState('');
  
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebugLog, setShowDebugLog] = useState(false);

  const [options, setOptions] = useState<CustomizationOptions>(defaultOptions);
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('auto');
  
  const [lastUsedOptions, setLastUsedOptions] = useState<CustomizationOptions | null>(null);
  const [lastUsedOutputLanguage, setLastUsedOutputLanguage] = useState<OutputLanguage | null>(null);

  const [sectionLanguages, setSectionLanguages] = useState<{[key in Section]?: Language}>(initialSectionLanguages);
  const [originLanguage, setOriginLanguage] = useState<Language>('English');

  const addLog = useCallback((log: string) => {
    setLogs(prevLogs => [...prevLogs, `[${new Date().toLocaleTimeString()}] ${log}`]);
  }, []);

  useEffect(() => {
    if (copyStatus === 'copied' || toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus, toastMessage]);
  
  const processScrapedData = async (scrapedData: ScrapedProductData) => {
      setProductData(scrapedData);
      
      const initialLanguage: Language = scrapedData.language === 'he' ? 'Hebrew' : 'English';
      addLog(`[SYSTEM] Detected origin language: ${initialLanguage}.`);
      setOriginLanguage(initialLanguage);

      const generationLanguage = outputLanguage === 'auto' ? initialLanguage : outputLanguage;
      addLog(`[SYSTEM] Setting initial generation language to: ${generationLanguage}.`);
      setSectionLanguages({ header: generationLanguage, description: generationLanguage, features: generationLanguage, reviews: generationLanguage });
      
      const content = await generateAllContent(scrapedData, options, generationLanguage, addLog);
      setGeneratedContent({ ...content, photo: scrapedData.image });
      setLastUsedOptions(options);
      setLastUsedOutputLanguage(outputLanguage);
      addLog('[SUCCESS] Generation process completed successfully.');
  };

  const handleGenerate = useCallback(async () => {
    if (!userInput.trim()) return;

    setLogs([]);
    addLog('[START] Starting new generation process...');
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    setProductData(null);
    setLastUsedOptions(null);
    setLastUsedOutputLanguage(null);
    setOriginLanguage('English');
    try {
        let scrapedData: ScrapedProductData;
        const inputType = detectInputType(userInput);
        addLog(`[SYSTEM] Detected input type: ${inputType}`);
        
        const sourceUrl = inputType === 'auto' ? userInput : 'manual-input';

        switch (inputType) {
            case 'html':
                scrapedData = await parseHtmlContent(userInput, sourceUrl, addLog);
                break;
            case 'text':
                scrapedData = await parseTextContent(userInput, sourceUrl, addLog);
                break;
            default: // 'auto' (URL)
                scrapedData = await scrapeUrl(userInput, addLog);
                break;
        }
        addLog(`[SYSTEM] Scraped and processed data:\n${JSON.stringify(scrapedData, null, 2)}`);
        await processScrapedData(scrapedData);
    } catch (e: any) {
      const errorMessage = e.message || 'An unexpected error occurred.';
      setError(errorMessage);
      addLog(`[ERROR] Generation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [userInput, options, addLog, outputLanguage]);

  const handleClear = useCallback(() => {
    setUserInput('');
    setGeneratedContent(null);
    setProductData(null);
    setError(null);
    setLogs([]);
    addLog('[SYSTEM] Cleared input and all generated content.');
  }, [addLog]);

  const handleReset = useCallback(() => {
    handleClear();
    setOptions(defaultOptions);
    setOutputLanguage('auto');
    addLog('[SYSTEM] Application state has been reset to defaults.');
  }, [handleClear, addLog]);

  const handleTranslateSection = useCallback(async (section: Section, targetLanguage: Language) => {
    if (!productData || !generatedContent || regeneratingSections.has(section)) return;
    
    addLog(`[START] Translating section: ${section} to ${targetLanguage}...`);
    setRegeneratingSections(prev => new Set(prev).add(section));
    
    const sectionContextMap: { [key in Section]?: string } = {
        header: 'a product header',
        description: 'a product description',
        features: 'a bulleted list of product features',
        reviews: 'a summary of customer reviews',
    };

    try {
        const contentToTranslate = generatedContent[section];
        if (typeof contentToTranslate !== 'string') throw new Error("No content to translate.");

        const newContent = await translateContent(contentToTranslate, targetLanguage, sectionContextMap[section] || 'text', addLog);
        
        setGeneratedContent(prev => prev ? { ...prev, [section]: newContent } : null);
        setSectionLanguages(prev => ({...prev, [section]: targetLanguage}));
        addLog(`[SUCCESS] Section ${section} translated.`);
    } catch (e: any) {
      const errorMessage = `Failed to translate ${section}: ${e.message}`;
      addLog(`[ERROR] ${errorMessage}`);
    } finally {
      setRegeneratingSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
    }
  }, [productData, generatedContent, addLog, regeneratingSections]);

  const handleRegenerateSection = useCallback(async (section: Section) => {
    if (!productData || regeneratingSections.has(section)) return;
    
    const languageForSection = sectionLanguages[section] || 'English';
    addLog(`[START] Regenerating section: ${section} in ${languageForSection}...`);
    setRegeneratingSections(prev => new Set(prev).add(section));
    
    try {
      const newContent = await regenerateSectionContent(section, productData, options, languageForSection, addLog);
      setGeneratedContent(prev => prev ? { ...prev, [section]: newContent } : null);
      addLog(`[SUCCESS] Section ${section} regenerated.`);
    } catch (e: any) {
      const errorMessage = `Failed to regenerate ${section}: ${e.message}`;
      addLog(`[ERROR] ${errorMessage}`);
    } finally {
      setRegeneratingSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
    }
  }, [productData, options, addLog, regeneratingSections, sectionLanguages]);

  // Effect for asynchronous sidebar option updates
  useEffect(() => {
    if (!generatedContent || !lastUsedOptions || isLoading || regeneratingSections.size > 0) {
      return;
    }

    const sectionsToUpdate = new Set<Section>();

    if (
      options.tone !== lastUsedOptions.tone ||
      options.length !== lastUsedOptions.length ||
      options.emojis !== lastUsedOptions.emojis
    ) {
      sectionsToUpdate.add('description');
    }

    if (sectionsToUpdate.size > 0) {
      setLastUsedOptions(options);
      sectionsToUpdate.forEach(section => {
        handleRegenerateSection(section);
      });
    }
  }, [options, generatedContent, lastUsedOptions, isLoading, regeneratingSections, handleRegenerateSection]);

  // Effect for asynchronous language updates
  useEffect(() => {
    if (!generatedContent || !lastUsedOptions || isLoading || regeneratingSections.size > 0 || lastUsedOutputLanguage === null) {
        return;
    }

    if (outputLanguage !== lastUsedOutputLanguage) {
        addLog(`[SYSTEM] Output language changed to: ${outputLanguage}. Updating content...`);
        setLastUsedOutputLanguage(outputLanguage);
        
        const targetLanguage = outputLanguage === 'auto' ? originLanguage : outputLanguage;
        
        const sectionsToTranslate: Section[] = ['header', 'description', 'features'];
        if (generatedContent.reviews) {
            sectionsToTranslate.push('reviews');
        }
        const promises = sectionsToTranslate.map(section => {
            if(sectionLanguages[section] !== targetLanguage) {
                return handleTranslateSection(section, targetLanguage);
            }
            return Promise.resolve();
        });

        Promise.all(promises).then(() => {
            addLog(`[SUCCESS] All sections updated to ${targetLanguage}.`);
        });
    }
  }, [outputLanguage, generatedContent, lastUsedOptions, isLoading, regeneratingSections, originLanguage, handleTranslateSection, lastUsedOutputLanguage, sectionLanguages, addLog]);


  const handleUpdateContent = useCallback((section: Section, newContent: string) => {
    setGeneratedContent(prev => prev ? { ...prev, [section]: newContent } : null);
  }, []);

  const formatToMarkdown = useCallback(() => {
    if (!generatedContent) return '';
    let markdown = `![Product Photo](${generatedContent.photo})\n\n## ${generatedContent.header}\n\n${generatedContent.description.trim()}\n\n### Features & Specs\n${generatedContent.features}`;
    if (generatedContent.reviews) {
        markdown += `\n\n### Reviews\n${generatedContent.reviews}`;
    }
    return markdown;
  }, [generatedContent]);

  const formatToHtml = useCallback(() => {
    if (!generatedContent) return '';
    const featuresHtml = generatedContent.features.split('\n').map(f => `<li>${f.replace('•', '').trim()}</li>`).join('');
    const reviewsHtml = generatedContent.reviews ? `
<h3>Reviews</h3>
<div style="white-space: pre-wrap;">${generatedContent.reviews}</div>
` : '';

    return `
<img src="${generatedContent.photo}" alt="Product Photo" style="max-width: 100%; height: auto; border-radius: 8px;" />
<h2>${generatedContent.header}</h2>
<p>${generatedContent.description.replace(/\n/g, '<br />')}</p>
<h3>Features &amp; Specs</h3>
<ul>${featuresHtml}</ul>${reviewsHtml}
    `;
  }, [generatedContent]);

  const handleCopy = useCallback((format: 'markdown' | 'html') => {
    const text = format === 'markdown' ? formatToMarkdown() : formatToHtml();
    copy(text);
    setToastMessage(`Copied as ${format.toUpperCase()}!`);
  }, [formatToMarkdown, formatToHtml, copy]);

  const handleDownload = useCallback(() => {
    if (!generatedContent) return;
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedContent.header}</title>
    <style>body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 20px auto; padding: 0 20px; } img { max-width: 100%; height: auto; border-radius: 8px; } ul { padding-left: 20px; }</style>
</head>
<body>
    <h1>${generatedContent.header}</h1>
    ${formatToHtml()}
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${generatedContent.header.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, [generatedContent, formatToHtml]);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey) {
        if (event.key >= '1' && event.key <= '5') {
            event.preventDefault();
            const sections: Section[] = ['photo', 'header', 'description', 'features', 'reviews'];
            if (event.key === '5' && !generatedContent?.reviews) return;
            handleRegenerateSection(sections[parseInt(event.key) - 1]);
        }
        if (event.key === 'c' && event.shiftKey) {
            event.preventDefault();
            handleCopy('markdown');
        }
    }
  }, [handleRegenerateSection, handleCopy, generatedContent]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  const isClearDisabled = !userInput.trim() && !generatedContent;
  const isOptionsDefault = JSON.stringify(options) === JSON.stringify(defaultOptions) && outputLanguage === 'auto';
  const isResetDisabled = isClearDisabled && isOptionsDefault;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        userInput={userInput}
        setUserInput={setUserInput}
        onGenerate={handleGenerate}
        isLoading={isLoading}
        generatedContent={generatedContent}
        onCopy={handleCopy}
        onDownload={handleDownload}
        showDebugLog={showDebugLog}
        setShowDebugLog={setShowDebugLog}
        onClear={handleClear}
        onReset={handleReset}
        isClearDisabled={isClearDisabled}
        isResetDisabled={isResetDisabled}
      />
      <div className="flex-grow flex flex-col md:flex-row relative">
        <Sidebar 
            options={options} 
            setOptions={setOptions} 
            isLoading={isLoading || regeneratingSections.size > 0}
            outputLanguage={outputLanguage}
            setOutputLanguage={setOutputLanguage}
        />
        <main className="flex-grow bg-gray-50">
          <ContentPreview
            content={generatedContent}
            isLoading={isLoading}
            error={error}
            regeneratingSections={regeneratingSections}
            onUpdateContent={handleUpdateContent}
            onRegenerateSection={handleRegenerateSection}
            sectionLanguages={sectionLanguages}
            onTranslateSection={handleTranslateSection}
          />
        </main>
      </div>
      {showDebugLog && <DebugLog logs={logs} onClose={() => setShowDebugLog(false)} />}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-40">
            {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;