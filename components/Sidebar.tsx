import React from 'react';
import { CustomizationOptions, Tone, Length, Emojis, Language, RadioOption, OutputLanguage } from '../types';
import { TONES, LENGTHS, EMOJIS, LANGUAGES } from '../constants';
import { InfoIcon } from './icons/InfoIcon';

interface OptionGroupProps {
  title: string;
  children: React.ReactNode;
  tooltipText?: string;
}

const OptionGroup: React.FC<OptionGroupProps> = ({ title, children, tooltipText }) => (
  <div className="mb-6">
    <div className="flex items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
        {tooltipText && (
            <div className="relative group ml-2">
                <InfoIcon className="h-4 w-4 text-gray-400 cursor-pointer" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {tooltipText}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                </div>
            </div>
        )}
    </div>
    {children}
  </div>
);

const RadioGroup = <T extends string>({ name, options, selected, onChange, disabled }: { name: string; options: RadioOption<T>[]; selected: T; onChange: (value: T) => void; disabled: boolean }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const tooltip = typeof option === 'string' ? undefined : option.tooltip;

        const button = (
            <button
                key={value}
                onClick={() => onChange(value)}
                disabled={disabled}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors disabled:opacity-50 ${
                selected === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-gray-100 border border-gray-300'
                }`}
            >
                {value}
            </button>
        );

        if (tooltip) {
            return (
                <div key={value} className="relative group">
                    {button}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {tooltip}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                    </div>
                </div>
            );
        }

        return button;
    })}
  </div>
);


interface SidebarProps {
  options: CustomizationOptions;
  setOptions: React.Dispatch<React.SetStateAction<CustomizationOptions>>;
  isLoading: boolean;
  outputLanguage: OutputLanguage;
  setOutputLanguage: (language: OutputLanguage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ options, setOptions, isLoading, outputLanguage, setOutputLanguage }) => {
  const updateOption = <K extends keyof CustomizationOptions>(key: K, value: CustomizationOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const selectedDisplayValue = outputLanguage === 'auto' ? 'Origin (Auto)' : outputLanguage;
  const handleLanguageChange = (value: 'Origin (Auto)' | Language) => {
    setOutputLanguage(value === 'Origin (Auto)' ? 'auto' : value);
  };
  const languageOptions: ('Origin (Auto)' | Language)[] = ['Origin (Auto)', ...LANGUAGES];

  return (
    <aside className="w-full md:w-72 lg:w-80 p-6 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex-grow">
            <h2 className="text-lg font-bold mb-6">Customize Output</h2>
            
            <OptionGroup title="Tone" tooltipText="Sets the writing style of the generated description to match your brand's voice.">
                <RadioGroup name="tone" options={TONES} selected={options.tone} onChange={(v) => updateOption('tone', v)} disabled={isLoading} />
            </OptionGroup>

            <OptionGroup title="Length (Description)" tooltipText="Controls the approximate word count of the description. Auto: AI determines the optimal length based on the source content. Short: 50-150 words, Medium: 150-300 words, Long: 300-500 words.">
                <RadioGroup name="length" options={LENGTHS} selected={options.length} onChange={(v) => updateOption('length', v)} disabled={isLoading} />
            </OptionGroup>
            
            <OptionGroup title="Emojis">
                <RadioGroup name="emojis" options={EMOJIS} selected={options.emojis} onChange={(v) => updateOption('emojis', v)} disabled={isLoading} />
            </OptionGroup>
            
            <OptionGroup title="Output Language" tooltipText="Sets the language for the generated text. 'Origin (Auto)' uses the language detected from the source.">
                <RadioGroup
                    name="outputLanguage"
                    options={languageOptions}
                    selected={selectedDisplayValue}
                    onChange={handleLanguageChange}
                    disabled={isLoading}
                />
            </OptionGroup>
        </div>
    </aside>
  );
};