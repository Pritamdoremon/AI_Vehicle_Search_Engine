import OpenAI from 'openai';
import { vehicleFiltersSchema, VehicleFilters } from '../types/filters';
import { bodyTypes, fuelTypes, transmissionTypes } from '../types/vehicle';
import { AppError } from '../utils/errors';

export interface FilterParser {
  parse(query: string): Promise<VehicleFilters>;
}

const filterPrompt = `Convert a vehicle search query into JSON filters only. Never return SQL or explanations.
Allowed keys: make, model, bodyType, fuelType, transmission, minPrice, maxPrice, minKmDriven, maxKmDriven, minSafetyRating, seatingCapacity, city, minYear, maxYear, ownership.
Allowed bodyType: hatchback, sedan, suv, muv, coupe, convertible.
Allowed fuelType: petrol, diesel, electric, hybrid, cng.
Allowed transmission: manual, automatic, amt, cvt, dct.
Use null or omit a key when the query does not specify it. Prices are in INR.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class LocalFilterParser implements FilterParser {
  public async parse(query: string): Promise<VehicleFilters> {
    const text = query.toLowerCase();
    const filters: VehicleFilters = {};
    const cityNames = ['Bangalore', 'Delhi', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Gurgaon', 'Kolkata'];
    const makes = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Honda', 'Toyota', 'Kia', 'Mahindra', 'Volkswagen', 'Renault', 'MG'];

    const bodyType = bodyTypes.find((value) => text.includes(value));
    const fuelType = fuelTypes.find((value) => text.includes(value));
    const transmission = transmissionTypes.find((value) => text.includes(value));
    const city = cityNames.find((value) => text.includes(value.toLowerCase()));
    const make = makes.find((value) => text.includes(value.toLowerCase()));

    if (bodyType) filters.bodyType = bodyType;
    if (fuelType) filters.fuelType = fuelType;
    if (transmission) filters.transmission = transmission;
    if (city) filters.city = city;
    if (make) filters.make = make;

    const seatMatch = text.match(/(\d+)\s*seater|seating\s*(?:capacity)?\s*(?:of)?\s*(\d+)/);
    if (seatMatch) filters.seatingCapacity = Number(seatMatch[1] ?? seatMatch[2]);

    const kmMatch = text.match(/(?:under|below|less than|upto|up to)\s*(\d[\d,]*)\s*(k|km|kms|kilometres|kilometers)/);
    if (kmMatch) filters.maxKmDriven = Number(kmMatch[1].replace(/,/g, '')) * (kmMatch[2] === 'k' ? 1000 : 1);

    const priceMatch = text.match(/(?:under|below|less than|upto|up to)\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|l|crore|cr)?/);
    if (priceMatch && !kmMatch) {
      const amount = Number(priceMatch[1]);
      const unit = priceMatch[2];
      filters.maxPrice = unit === 'crore' || unit === 'cr' ? amount * 10000000 : unit ? amount * 100000 : amount;
    }

    const safetyMatch = text.match(/(?:safety|rating)\s*(?:rating)?\s*(?:above|over|at least|of)?\s*(\d(?:\.\d)?)/);
    if (safetyMatch) filters.minSafetyRating = Number(safetyMatch[1]);
    return vehicleFiltersSchema.parse(filters);
  }
}

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new AppError(502, 'The language model returned invalid JSON.');
  }
}

export class OpenAiFilterParser implements FilterParser {
  private readonly client?: OpenAI;
  private readonly model: string;
  private readonly fallback: FilterParser;

  public constructor(client?: OpenAI, model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini', fallback: FilterParser = new LocalFilterParser()) {
    this.client = client;
    this.model = model;
    this.fallback = fallback;
  }

  public async parse(query: string): Promise<VehicleFilters> {
    if (!process.env.OPENAI_API_KEY) {
      return this.fallback.parse(query);
    }

    try {
      const client = this.client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: filterPrompt,
          },
          { role: 'user', content: query }
        ]
      });

      const content = response.choices[0]?.message.content;
      if (!content) throw new AppError(502, 'The language model returned an empty response.');

      const parsed = vehicleFiltersSchema.safeParse(parseJsonObject(content));
      if (!parsed.success) throw new AppError(502, 'The language model returned unsupported vehicle filters.');
      return parsed.data;
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 429) {
        return this.fallback.parse(query);
      }
      throw new AppError(502, 'The language model request failed.');
    }
  }
}

export class GeminiFilterParser implements FilterParser {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallback: FilterParser;

  public constructor(
    apiKey = process.env.GEMINI_API_KEY ?? '',
    model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
    fallback: FilterParser = new LocalFilterParser()
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.fallback = fallback;
  }

  public async parse(query: string): Promise<VehicleFilters> {
    if (!this.apiKey || this.apiKey === 'your_gemini_key_here') return this.fallback.parse(query);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${filterPrompt}\n\nUser query: ${query}` }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) return this.fallback.parse(query);

      const data: unknown = await response.json();
      if (!isRecord(data) || !Array.isArray(data.candidates)) throw new AppError(502, 'Gemini returned an invalid response.');
      const firstCandidate = data.candidates[0];
      if (!isRecord(firstCandidate) || !isRecord(firstCandidate.content) || !Array.isArray(firstCandidate.content.parts)) {
        throw new AppError(502, 'Gemini returned an empty response.');
      }
      const firstPart = firstCandidate.content.parts[0];
      if (!isRecord(firstPart) || typeof firstPart.text !== 'string') throw new AppError(502, 'Gemini returned an invalid response.');

      const parsed = vehicleFiltersSchema.safeParse(parseJsonObject(firstPart.text));
      if (!parsed.success) throw new AppError(502, 'Gemini returned unsupported vehicle filters.');
      return parsed.data;
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      return this.fallback.parse(query);
    }
  }
}

export function createFilterParser(): FilterParser {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_key_here') return new GeminiFilterParser();
  return new OpenAiFilterParser();
}