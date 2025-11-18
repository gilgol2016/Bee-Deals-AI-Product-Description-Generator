import { GoogleGenAI, Type } from "@google/genai";
import { ScrapedProductData, CustomizationOptions, Section, GeneratedContent, Language } from '../types';

// This function assumes process.env.API_KEY is available in the environment.
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Removes unwanted boilerplate from the AI's response, such as markdown headers
 * or conversational introductory phrases.
 * @param text The raw text from the AI.
 * @returns The cleaned text.
 */
const cleanAiOutput = (text: string): string => {
  if (!text) return '';
  let cleanedText = text.trim();
  
  // Remove markdown-style headers (e.g., "### Title\n") that are on their own line.
  cleanedText = cleanedText.replace(/^#+\s.*$/gm, '');

  // Remove common conversational intros, including the specific Hebrew one.
  const introsToRemove = [
    /Here is the.*:\s*/i,
    /Here's an.*:\s*/i,
    /להלן.*:/i, // Matches "להלן" followed by anything, up to a colon.
  ];

  for (const introPattern of introsToRemove) {
    cleanedText = cleanedText.replace(introPattern, '');
  }
  
  return cleanedText.trim();
};

export const translateContent = async (
  textToTranslate: string,
  targetLanguage: Language,
  sectionContext: string, // e.g., 'a product header', 'a bulleted list of features'
  addLog: (log: string) => void
): Promise<string> => {
  if (!textToTranslate) return '';
  
  const ai = getAi();
  const prompt = `
    Translate the following text into ${targetLanguage}.
    The text is ${sectionContext}.
    Maintain the original tone, formatting (like bullet points), and meaning.
    IMPORTANT: Provide ONLY the translated text. Do not add any introductory phrases like "Here is the translation:".

    --- TEXT TO TRANSLATE ---
    ${textToTranslate}
  `;

  addLog(`[TRANSLATE] Sending translation prompt for ${sectionContext} to ${targetLanguage}...`);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
    });

    const translatedText = cleanAiOutput(response.text.trim());
    addLog(`[TRANSLATE] Received translated text:\n${translatedText}`);
    return translatedText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog(`[TRANSLATE-ERROR] Failed to translate: ${errorMessage}`);
    throw new Error(`AI failed to translate the content for ${sectionContext}.`);
  }
};


const generatePrompt = (
  product: ScrapedProductData,
  options: CustomizationOptions,
  sections: { section: Section, language: Language }[]
): string => {
  const { tone, length, emojis } = options;

  let prompt = `Analyze the following product data:\n`;
  prompt += `- Title: ${product.title}\n`;
  prompt += `- Description: ${product.description}\n`;
  prompt += `- Features: ${product.features.join(', ')}\n`;
  if (product.reviews && product.reviews.length > 0) {
    prompt += `- Customer Reviews: ${product.reviews.join('; ')}\n`;
  }
  prompt += `\nBased on this data, generate the following sections for an eCommerce blog post.
IMPORTANT: For all sections, provide ONLY the raw text content requested. Do NOT add any extra headers, titles (like '### Header'), markdown formatting, or introductory sentences (like 'Here is the description:'). The output must be ready to be directly copied and pasted.\n`;

  for (const { section, language } of sections) {
      if (section === 'photo') continue;

      if (section === 'header') {
        prompt += `- A catchy, SEO-friendly header in ${language}.\n`;
      }
      if (section === 'description') {
        let lengthInstruction: string;
        if (length === 'Auto') {
            lengthInstruction = 'be an optimal length based on the provided product data. Analyze the detail level of the source description and features to decide if a short, medium, or long description is most appropriate to be comprehensive without being repetitive.';
        } else {
            const lengthMap = {
                'Short': '50-150 words',
                'Medium': '150-300 words',
                'Long': '300-500 words',
            };
            lengthInstruction = `be approximately ${lengthMap[length]} long`;
        }
        
        const emojiInstruction = `${emojis === 'Yes' ? 'use a few relevant emojis sparingly' : 'not use any emojis'}`;
        let toneInstruction = '';
    
        const langContext = language === 'Hebrew' ? ' in Hebrew' : '';
        const hebrewStyleGuideline = language === 'Hebrew' ? " IMPORTANT FOR HEBREW: Write in a natural, descriptive style. Avoid addressing the reader directly in the second person (using words like 'you', 'your', 'אתם', 'לכם'). Instead, describe the product and its benefits from a more neutral perspective, as if presenting facts." : "";
    
        switch (tone) {
            case 'Formal':
                toneInstruction = `in a strict, formal, and objective${langContext} tone. Avoid all superlatives (like 'amazing', 'breakthrough'), marketing jargon, and exaggerated claims. Focus purely on the product's specifications and practical applications in a direct, factual manner, similar to a technical sheet but in prose.`;
                break;
            case 'Casual':
                toneInstruction = `in a friendly, relaxed, and conversational${langContext} tone. While being approachable, ground the description in facts about the product's features and benefits. Avoid excessive hype.`;
                break;
            case 'Persuasive':
                toneInstruction = `in an engaging and persuasive${langContext} tone. Focus on the product's key benefits and how it solves the customer's problems. Use compelling language to create desire, but base all claims on the provided product data. Tell a story about the value of the product.`;
                break;
        }
        
        prompt += `- An engaging product description in ${language}. It should be ${toneInstruction}, ${lengthInstruction}, and ${emojiInstruction}.${hebrewStyleGuideline}\n`;
      }
      if (section === 'features') {
        prompt += `- A clean, bulleted list of the product's key features and specifications in ${language}. Format as a single string with each feature on a new line starting with a bullet point (e.g., '• Feature 1\\n• Feature 2').\n`;
      }
      if (section === 'reviews') {
        prompt += `- A summary of the main points from customer reviews in ${language}. If there are both positive and negative points, divide them clearly. Format it with subheadings like "Positive Feedback" and "Areas for Improvement". If reviews are overwhelmingly one-sided, a single summary is fine. Format as a single string with newlines for structure.\n`;
      }
  }

  return prompt;
};

export const generateAllContent = async (
  product: ScrapedProductData,
  options: CustomizationOptions,
  language: Language,
  addLog: (log: string) => void
): Promise<Omit<GeneratedContent, 'photo'>> => {
  const ai = getAi();
  const sectionsToGenerate = [
    { section: 'header', language },
    { section: 'description', language },
    { section: 'features', language },
  ] as { section: Section, language: Language}[];

  if (product.reviews && product.reviews.length > 0) {
    sectionsToGenerate.push({ section: 'reviews', language });
  }

  const prompt = generatePrompt(product, options, sectionsToGenerate);
  
  addLog(`[GENERATE-ALL] Sending prompt in ${language}...\nPrompt: ${prompt}`);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          header: { type: Type.STRING, description: 'The generated SEO-friendly header.' },
          description: { type: Type.STRING, description: 'The generated product description.' },
          features: { type: Type.STRING, description: 'The bulleted list of features as a single string.' },
          reviews: { type: Type.STRING, description: 'The summary of customer reviews, if requested.' },
        },
      },
    },
  });

  const text = response.text.trim();
  addLog(`[GENERATE-ALL] Received raw JSON response:\n${text}`);
  try {
    const parsed = JSON.parse(text);
    parsed.header = cleanAiOutput(parsed.header || '');
    parsed.description = cleanAiOutput(parsed.description || '');
    parsed.features = (parsed.features || '').split('\n').map(line => cleanAiOutput(line).trim().replace(/^-|^\*/, '•').trim()).filter(Boolean).join('\n');
    if (parsed.reviews) {
        parsed.reviews = cleanAiOutput(parsed.reviews || '');
    }

    addLog(`[GENERATE-ALL] Successfully parsed and cleaned JSON response.`);
    return parsed;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    addLog(`[GENERATE-ALL-ERROR] Failed to parse Gemini JSON response: ${errorMessage}`);
    console.error("Failed to parse Gemini JSON response:", text);
    throw new Error("AI failed to generate a valid response. Check the debug log for details.");
  }
};

export const regenerateSectionContent = async (
  section: Section,
  product: ScrapedProductData,
  options: CustomizationOptions,
  language: Language,
  addLog: (log: string) => void
): Promise<string> => {
    if (section === 'photo') {
        const newUrl = `${product.image}&t=${Date.now()}`;
        addLog(`[REGENERATE-PHOTO] Returning new URL: ${newUrl}`);
        return newUrl;
    }
    
    const ai = getAi();
    const prompt = generatePrompt(product, options, [{ section, language }]);
    
    addLog(`[REGENERATE-SECTION] Sending prompt for section "${section}" in ${language}...\nPrompt: ${prompt}`);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
    });

    let content = response.text.trim();
    content = cleanAiOutput(content);
    addLog(`[REGENERATE-SECTION] Received and cleaned raw response for section "${section}":\n${content}`);

    if(section === 'features') {
        content = content.split('\n').map(line => line.trim().replace(/^-|^\*/, '•').trim()).filter(Boolean).join('\n');
        addLog(`[REGENERATE-SECTION] Cleaned up features list.`);
    }

    return content;
};