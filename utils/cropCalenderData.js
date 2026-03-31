import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

const CROP_CALENDAR_PROMPT = (cropName) => `
You are an agricultural data expert. Generate a detailed crop calendar JSON for "${cropName}".

Return ONLY a valid JSON object with no explanation, no markdown, no code fences.

The JSON must follow this exact structure:

{
  "crop_name": "string",
  "scientific_name": "string",
  "crop_type": "string (e.g. Cereal, Vegetable, Fruit, Pulse, Oilseed)",
  "total_duration_days": number,
  "stages": [
    {
      "stage_id": number,
      "stage_name": "string",
      "category": "sowing | growth_care | harvesting | post_harvest",
      "start_day": number,
      "end_day": number,
      "duration_days": number,
      "description": "string",
      "tasks": [
        {
          "task_name": "string",
          "description": "string",
          "frequency": "string (e.g. Once, Daily, Weekly, As needed)",
          "tips": "string"
        }
      ],
      "irrigation": {
        "required": true or false,
        "frequency": "string",
        "amount_mm_per_week": number or null,
        "method": "string (e.g. Drip, Flood, Sprinkler)"
      },
      "fertilizer": {
        "required": true or false,
        "type": "string (e.g. NPK 20-20-0, Urea, Organic Compost)",
        "dose_kg_per_hectare": number or null,
        "application_method": "string"
      },
      "pest_and_disease": [
        {
          "name": "string",
          "type": "pest or disease",
          "symptoms": "string",
          "control_method": "string"
        }
      ],
      "weather_conditions": {
        "temperature_min_celsius": number,
        "temperature_max_celsius": number,
        "humidity_percent": number,
        "rainfall_mm": number or null
      }
    }
  ],
  "harvest_indicators": ["string", "string"],
  "expected_yield_per_hectare": "string",
  "storage": {
    "method": "string",
    "temperature_celsius": number,
    "humidity_percent": number,
    "shelf_life": "string",
    "tips": "string"
  }
}
`;

const generateCropData = async (cropName) => {
    const result = await model.generateContent(CROP_CALENDAR_PROMPT(cropName));
    const rawText = result.response.text();

    // Strip any accidental markdown fences if model adds them
    const cleaned = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

    const parsed = JSON.parse(cleaned);
    return parsed;
}

export { generateCropData };