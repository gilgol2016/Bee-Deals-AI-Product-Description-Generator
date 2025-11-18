import { Tone, Length, Emojis, Language, OptionWithTooltip } from './types';

export const TONES: OptionWithTooltip<Tone>[] = [
    { value: 'Formal', tooltip: 'Objective, factual, and direct. Focuses on specifications and is ideal for technical products or formal contexts.' },
    { value: 'Casual', tooltip: 'Friendly, relaxed, and conversational. Good for everyday products and connecting with a broad audience.' },
    { value: 'Persuasive', tooltip: 'Engaging and benefit-focused. Uses marketing language to create desire and convince the customer to buy.' },
];
export const LENGTHS: Length[] = ['Auto', 'Short', 'Medium', 'Long'];
export const EMOJIS: Emojis[] = ['Yes', 'No'];
export const LANGUAGES: Language[] = ['English', 'Hebrew'];