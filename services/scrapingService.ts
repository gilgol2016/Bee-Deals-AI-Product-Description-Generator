
import { GoogleGenAI, Type } from "@google/genai";
import { ScrapedProductData } from '../types';

// This function assumes process.env.API_KEY is available in the environment.
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseJsonOrThrow = (text: string): any => {
    // Find the JSON block within the text, which might be wrapped in ```json ... ```
    // or just be a raw JSON object within a larger text.
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*}|\[[\s\S]*])/);

    if (!jsonMatch) {
        console.error("No JSON block found in AI response:", text);
        throw new Error("The AI did not return a recognizable data format (no JSON block found).");
    }

    // The actual JSON string is in one of the capturing groups
    const jsonText = jsonMatch[1] || jsonMatch[2];
    
    try {
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Failed to parse extracted JSON:", jsonText);
        throw new Error("The AI returned an invalid data format (not valid JSON).");
    }
}

export const scrapeUrl = async (url: string, addLog: (log: string) => void): Promise<ScrapedProductData> => {
  if (!url || !url.startsWith('http')) {
    throw new Error('Invalid URL provided. Please enter a full URL starting with http:// or https://.');
  }

  const ai = getAi();
  const prompt = `
    You are an expert web scraper. Your task is to extract product information from a URL. You must follow a hybrid approach.

    **URL:** ${url}

    **Extraction Strategy (Chain of Thought):**
    
    1.  **Access Live Content:** Use your search tool to fetch the live HTML of the URL.

    2.  **Primary Method (Structured Data):**
        - Your **first priority** is to find a \`<script type="application/ld+json">\` tag in the HTML.
        - If you find it, parse its content. Look for the object with \`"@type": "Product"\`.
        - Extract the 'name' (for title), 'description', 'image', 'offers.price', and 'sku'/'mpn' directly from this JSON-LD object. This is the most reliable source.

    3.  **Secondary Method (Fallback):**
        - **If and only if** you cannot find a valid JSON-LD Product script, fall back to analyzing the visible HTML content.
        - **Image:** Look for the \`<meta property="og:image" content="...">\` tag in the \`<head>\`.
        - **Title:** Find the main \`<h1>\` tag.
        - **Description & Features:** Find the main content blocks related to the title.
        - **Reviews:** If you find a customer reviews section, extract a few representative snippets (up to 5).

    4.  **Final Output:**
        - Determine the page's primary language ('en', 'he', etc.).
        - Format the final data into a single, valid JSON object.
        - Include debugging info: the URL you retrieved and a context snippet from the data source you used.

    **JSON Structure (MUST include all fields, 'reviews' and 'price' are optional):**
    {
      "title": "The full product title",
      "description": "The main product description",
      "features": ["An array of key features or specifications"],
      "reviews": ["An array of key review snippets, if found"],
      "image": "The absolute URL to the main product image",
      "price": "The product's price",
      "language": "The detected two-letter language code",
      "retrievedURL": "The exact URL your search tool accessed",
      "contextSnippet": "A 20-30 word direct quote from the data source you used."
    }
  `;

  addLog(`[SCRAPE] Sending prompt with hybrid scraping strategy...`);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [{ text: prompt }] }],
      config: { tools: [{ googleSearch: {} }] }
    });

    const jsonText = response.text;
    addLog(`[SCRAPE] Received raw response:\n${jsonText}`);
    
    const data = parseJsonOrThrow(jsonText);

    if (!data.title) throw new Error("AI failed to extract the product title.");
    
    addLog(`[SCRAPE-DEBUG] Retrieved URL: ${data.retrievedURL}`);
    addLog(`[SCRAPE-DEBUG] Context Snippet: "${data.contextSnippet}"`);
    addLog(`[SCRAPE] Successfully parsed JSON data.`);

    return {
      url,
      title: data.title,
      description: data.description || '',
      features: Array.isArray(data.features) ? data.features : (data.features ? [String(data.features)] : []),
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
      image: data.image || '',
      price: data.price ? String(data.price) : undefined,
      language: data.language || 'en',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog(`[SCRAPE-ERROR] Error during AI scraping: ${errorMessage}`);
    console.error("Error during AI scraping:", error);
    throw new Error("AI failed to extract product data from the URL. The site may be too complex or is blocking access. Try 'Paste HTML' mode.");
  }
};


export const parseHtmlContent = async (html: string, url: string, addLog: (log: string) => void): Promise<ScrapedProductData> => {
    if (!html) throw new Error('No HTML content provided.');

    const ai = getAi();
    const instructions = `
        You are an expert HTML data parser. You will be given the full raw HTML of a product page. Your task is to extract product information from it.

        **Extraction Strategy (Chain of Thought):**

        1.  **Primary Method (Structured Data):**
            - Your **first priority** is to find a \`<script type="application/ld+json">\` tag in the provided HTML.
            - If you find it, parse its content. Look for the object with \`"@type": "Product"\`.
            - Extract the 'name' (for title), 'description', 'image', 'offers.price', and 'sku'/'mpn' directly from this JSON-LD object. This is the most reliable source.

        2.  **Secondary Method (Fallback):**
            - **If and only if** you cannot find a valid JSON-LD Product script, fall back to analyzing the rest of the HTML.
            - **Image:** Look for the \`<meta property="og:image" content="...">\` tag in the \`<head>\`.
            - **Title:** Find the main \`<h1>\` tag.
            - **Description & Features:** Find the main content blocks related to the title.
            - **Reviews:** If you find a customer reviews section, extract a few representative snippets (up to 5).
        
        3.  **Final Output:**
            - Determine the page's primary language ('en', 'he', etc.).
            - You will format the final data into a JSON object according to the provided schema.
    `;
    
    const fullPrompt = `${instructions}\n\n--- HTML CONTENT TO PARSE ---\n${html}`;

    addLog(`[PARSE-HTML] Sending prompt to parse provided HTML...`);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: fullPrompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: 'The full product title' },
                        description: { type: Type.STRING, description: 'The main product description' },
                        features: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'An array of key features or specifications'
                        },
                        reviews: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'An array of key review snippets, if found'
                        },
                        image: { type: Type.STRING, description: 'The absolute URL to the main product image' },
                        price: { type: Type.STRING, description: "The product's price, if found" },
                        language: { type: Type.STRING, description: 'The detected two-letter language code' }
                    },
                    required: ['title', 'description', 'features', 'image', 'language']
                }
            }
        });

        const jsonText = response.text;
        addLog(`[PARSE-HTML] Received raw JSON response:\n${jsonText}`);

        const data = JSON.parse(jsonText);

        if (!data.title) throw new Error("AI failed to extract the product title from the HTML.");

        addLog(`[PARSE-HTML] Successfully parsed JSON data from HTML.`);

        return {
            url,
            title: data.title,
            description: data.description || '',
            features: Array.isArray(data.features) ? data.features : (data.features ? [String(data.features)] : []),
            reviews: Array.isArray(data.reviews) ? data.reviews : [],
            image: data.image || '',
            price: data.price ? String(data.price) : undefined,
            language: data.language || 'en',
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(`[PARSE-HTML-ERROR] Error during HTML parsing: ${errorMessage}`);
        console.error("Error during HTML parsing:", error);
        throw new Error("AI failed to extract product data from the provided HTML.");
    }
};

export const parseTextContent = async (text: string, url: string, addLog: (log: string) => void): Promise<ScrapedProductData> => {
    if (!text) throw new Error('No text content provided.');

    const ai = getAi();
    const prompt = `
        You are an expert data extractor. Your task is to extract product information from the following plain text.

        **Instructions:**
        1. Read the text and identify the main product's title, description, and key features.
        2. If customer reviews are present, extract a few representative snippets.
        3. If a price is mentioned, extract it.
        4. Determine the primary language of the text (e.g., 'en', 'he').
        5. The image URL is unknown and should be an empty string.

        --- TEXT CONTENT TO PARSE ---
        ${text}
    `;

    addLog(`[PARSE-TEXT] Sending prompt to parse provided text...`);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: 'The full product title' },
                        description: { type: Type.STRING, description: 'The main product description' },
                        features: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'An array of key features or specifications'
                        },
                        reviews: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'An array of key review snippets, if found'
                        },
                        image: { type: Type.STRING, description: 'Should be an empty string' },
                        price: { type: Type.STRING, description: "The product's price, if found" },
                        language: { type: Type.STRING, description: 'The detected two-letter language code' }
                    },
                    required: ['title', 'description', 'features', 'image', 'language']
                }
            }
        });

        const jsonText = response.text;
        addLog(`[PARSE-TEXT] Received raw JSON response:\n${jsonText}`);

        const data = JSON.parse(jsonText);

        if (!data.title) throw new Error("AI failed to extract the product title from the text.");

        addLog(`[PARSE-TEXT] Successfully parsed JSON data from text.`);

        return {
            url,
            title: data.title,
            description: data.description || '',
            features: Array.isArray(data.features) ? data.features : (data.features ? [String(data.features)] : []),
            reviews: Array.isArray(data.reviews) ? data.reviews : [],
            image: '', // Image cannot be determined from text
            price: data.price ? String(data.price) : undefined,
            language: data.language || 'en',
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(`[PARSE-TEXT-ERROR] Error during text parsing: ${errorMessage}`);
        console.error("Error during text parsing:", error);
        throw new Error("AI failed to extract product data from the provided text.");
    }
};