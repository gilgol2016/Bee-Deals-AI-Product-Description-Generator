export type Tone = 'Formal' | 'Casual' | 'Persuasive';
export type Length = 'Auto' | 'Short' | 'Medium' | 'Long';
export type Emojis = 'Yes' | 'No';
export type Language = 'English' | 'Hebrew';
export type OutputLanguage = 'auto' | Language;
export type ScrapeMode = 'auto' | 'html' | 'text';

export interface OptionWithTooltip<T extends string> {
  value: T;
  tooltip: string;
}

export type RadioOption<T extends string> = T | OptionWithTooltip<T>;

export interface CustomizationOptions {
  tone: Tone;
  length: Length;
  emojis: Emojis;
}

export interface ScrapedProductData {
  url: string;
  image: string;
  title: string;
  description: string;
  features: string[];
  price?: string; // For Bee Deals
  language?: string; // e.g., 'en', 'he'
  reviews?: string[];
}

export interface GeneratedContent {
  photo: string;
  header: string;
  description: string;
  features: string;
  reviews?: string;
}

export type Section = keyof GeneratedContent;