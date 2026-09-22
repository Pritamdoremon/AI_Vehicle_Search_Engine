import { z } from 'zod';
import { vehicleFiltersSchema } from '../types/filters';
import { callGeminiText } from './llmFilterService';

// Small payload for Gemini — only real fields from this project.
export const advisorVehicleSchema = z.object({
  id: z.number().int().positive(),
  make: z.string().min(1),
  model: z.string().min(1),
  price: z.number().optional(),
  bodyType: z.string().optional(),
  transmission: z.string().optional(),
  fuelType: z.string().optional(),
  seatingCapacity: z.number().optional(),
  mileage: z.number().optional(),
  city: z.string().optional(),
  matchScore: z.number().nullable().optional()
});

export const advisorRequestSchema = z.object({
  query: z.string().trim().max(500).optional(),
  filters: vehicleFiltersSchema,
  vehicles: z.array(advisorVehicleSchema).min(1).max(5)
});

export type AdvisorRequest = z.infer<typeof advisorRequestSchema>;

const advisorInstruction = `You are a vehicle recommendation assistant.

Explain the provided vehicle search results using ONLY the information provided.

Do not invent vehicle specifications, prices, mileage, features, availability, reviews, or other facts.

Explain why the vehicles match the user's requirements.

Mention important differences only when those differences are present in the provided data.

Keep the response short, clear and useful (about 3–6 short sentences or short bullet lines).

Do not claim that one vehicle is objectively the best.

Do not make unsupported recommendations.`;

/**
 * One Gemini call for the top vehicles already ranked by our backend.
 */
export async function generateVehicleAdvice(input: AdvisorRequest): Promise<string | null> {
  const payload = {
    filters: input.filters,
    vehicles: input.vehicles.map((vehicle) => ({
      id: vehicle.id,
      name: `${vehicle.make} ${vehicle.model}`,
      make: vehicle.make,
      model: vehicle.model,
      price: vehicle.price,
      bodyType: vehicle.bodyType,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seatingCapacity: vehicle.seatingCapacity,
      mileage: vehicle.mileage,
      city: vehicle.city,
      matchScore: vehicle.matchScore ?? null
    })),
    searchQuery: input.query || null
  };

  const prompt = `${advisorInstruction}

Data (JSON):
${JSON.stringify(payload, null, 2)}`;

  return callGeminiText(prompt, { temperature: 0.3, json: false });
}
