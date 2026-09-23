import { z } from "zod";
import type { DemoWasteSample, WasteCategory } from "../../shared/types";
import { DEMO_WASTE_SAMPLES } from "./demoFixtures";
import { hashString } from "./noise";

export interface WasteClassificationOutput {
  category: WasteCategory;
  label: string;
  confidence: number;
  disposalGuidance: string[];
  environmentalImpact: string;
  isDemo: boolean;
  usedGemini: boolean;
  limitations: string[];
}

const CATEGORY_LABELS: Record<WasteCategory, string> = {
  plastic: "Plastic",
  paper: "Paper & Cardboard",
  glass: "Glass",
  metal: "Metal",
  organic: "Organic / Food",
  "e-waste": "Electronic Waste",
  hazardous: "Hazardous Material",
  mixed: "Mixed Material",
  unknown: "Unclassified",
};

/**
 * Canned safety-first guidance. Hazardous/e-waste guidance here is authoritative —
 * model output never replaces it (RULES.md: no unsafe hazardous disposal advice).
 */
const GUIDANCE: Record<WasteCategory, string[]> = {
  plastic: [
    "Empty and rinse before recycling.",
    "Check the local recycling rules for the resin code — acceptance varies by municipality.",
    "Place in dry recycling only if your local collection accepts this plastic type.",
  ],
  paper: [
    "Keep dry and free of food residue.",
    "Place with paper/cardboard recycling if available locally.",
  ],
  glass: [
    "Rinse the container.",
    "Recycle glass; separate caps/lids if local rules require it.",
  ],
  metal: [
    "Rinse if it held food or drink.",
    "Aluminium and steel cans are widely accepted in metal recycling.",
  ],
  organic: [
    "Compost at home if possible, otherwise use the organic/wet-waste collection.",
    "Keep out of dry-recycling bins — it contaminates the batch.",
  ],
  "e-waste": [
    "Do not place in household waste or general recycling.",
    "Use a manufacturer take-back scheme, retailer return, or municipal e-waste collection point.",
    "Remove batteries where separable and recycle them separately at a battery collection point.",
  ],
  hazardous: [
    "Do NOT place in household recycling or general waste.",
    "Keep in its original labelled container, upright, away from children and pets.",
    "Take to a designated hazardous-waste collection point run by the local authority or retailer.",
    "If it is leaking or spilled, avoid direct contact, ventilate the area, and follow local guidance for the substance.",
  ],
  mixed: [
    "Separate components where possible (e.g. remove plastic sleeves or caps).",
    "If materials cannot be separated, use general waste and note the recycling contamination risk.",
  ],
  unknown: [
    "Insufficient certainty to advise specific recycling — use general waste to avoid contaminating recycling streams.",
    "When in doubt, check your local municipal waste guidance for the material type.",
  ],
};

const IMPACT: Record<WasteCategory, string> = {
  plastic:
    "Plastic that misses the recycling stream can persist for centuries, fragmenting into microplastics and entering waterways and food chains.",
  paper:
    "Recycling paper reduces demand for virgin pulp and lowers deforestation and processing emissions; soiled paper can spoil a recycling batch.",
  glass:
    "Glass is infinitely recyclable without quality loss; each tonne recycled saves raw material and furnace energy.",
  metal:
    "Recycling metals uses a fraction of the energy of primary production and reduces mining pressure.",
  organic:
    "Organic waste in landfill generates methane, a potent greenhouse gas; composting avoids those emissions and returns nutrients to soil.",
  "e-waste":
    "Electronic waste contains recoverable metals and also lead, mercury and other hazards — informal disposal releases toxins into air, soil and water.",
  hazardous:
    "Household hazardous materials can leach into soil and groundwater or create toxic fumes if incinerated with general waste.",
  mixed:
    "Mixed-material items often cannot be recycled together; separation improves recovery rates and reduces contamination.",
  unknown:
    "Uncertain classification means uncertain impact — cautious disposal prevents accidental contamination.",
};

const visionSchema = z.object({
  category: z.enum([
    "plastic",
    "paper",
    "glass",
    "metal",
    "organic",
    "e-waste",
    "hazardous",
    "mixed",
    "unknown",
  ]),
  confidence: z.number().min(0).max(1),
  label: z.string().min(2).max(80),
});

function demoSampleById(id: string): DemoWasteSample | undefined {
  return DEMO_WASTE_SAMPLES.find((s) => s.id === id);
}

function buildOutput(
  category: WasteCategory,
  label: string,
  confidence: number,
  isDemo: boolean,
  usedGemini: boolean,
  limitations: string[],
): WasteClassificationOutput {
  const safeCategory: WasteCategory =
    category === "hazardous" || category === "e-waste" ? category : category;
  return {
    category: safeCategory,
    label: label || CATEGORY_LABELS[safeCategory],
    confidence: Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100,
    // Safety rule: hazardous guidance always comes from the canned safe list.
    disposalGuidance: GUIDANCE[safeCategory],
    environmentalImpact: IMPACT[safeCategory],
    isDemo,
    usedGemini,
    limitations:
      safeCategory === "hazardous"
        ? [...limitations, "If this is not actually hazardous, still treat it cautiously until verified."]
        : limitations,
  };
}

export async function classifyWaste(input: {
  sampleId?: string;
  fileName?: string;
  dataUrl?: string;
  geminiConfigured: boolean;
}): Promise<WasteClassificationOutput> {
  if (input.sampleId) {
    const sample = demoSampleById(input.sampleId);
    if (!sample) {
      return buildOutput("unknown", "Unclassified", 0, true, false, [
        "Unknown demo sample id — no classification available.",
      ]);
    }
    return buildOutput(sample.category, sample.name, 0.95, true, false, [
      "Demo classification from a pre-set sample — the image was not analysed.",
    ]);
  }

  const hasImage = Boolean(input.dataUrl || input.fileName);
  if (!hasImage) {
    return buildOutput("unknown", "Unclassified", 0, true, false, [
      "No image or sample provided.",
    ]);
  }

  // Deterministic demo classification (no vision model configured, or sample-only input).
  const seedSource = input.fileName ?? input.dataUrl?.slice(0, 64) ?? "upload";
  const seed = hashString(seedSource);
  const pool = DEMO_WASTE_SAMPLES.filter((s) => s.category !== "hazardous");
  const pick = pool[seed % pool.length];
  const confidence = 0.55 + ((seed % 20) / 100);
  const limitations = [
    input.geminiConfigured
      ? "Vision classification unavailable for this input — deterministic demo classification used instead."
      : "No vision model configured (GEMINI_API_KEY missing) — this is a Demo Classification, not AI analysis of your image.",
    "Demo classifications are illustrative; verify disposal with local municipal guidance.",
  ];
  return buildOutput(pick.category, `${pick.name} (demo match)`, confidence, true, false, limitations);
}

/** Vision classification with image bytes passed to Gemini. */
export async function classifyWasteWithImage(input: {
  dataUrl: string;
  fileName?: string;
  generateJsonWithImage: (
    prompt: string,
    schema: z.ZodType<{ category: WasteCategory; confidence: number; label: string }>,
    image: { mimeType: string; data: string },
  ) => Promise<{ data: { category: WasteCategory; confidence: number; label: string } | null; usedGemini: boolean }>;
  geminiConfigured: boolean;
}): Promise<WasteClassificationOutput> {
  const match = input.dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return buildOutput("unknown", "Unclassified", 0, true, false, [
      "Unsupported image format — expected png, jpeg, webp or gif.",
    ]);
  }
  const [, mimeType, data] = match;

  if (input.geminiConfigured) {
    const ai = await input.generateJsonWithImage(
      [
        "Classify this waste image for recycling/disposal guidance.",
        "Return JSON: {category: plastic|paper|glass|metal|organic|e-waste|hazardous|mixed|unknown,",
        "confidence: 0..1, label: short human-readable label}.",
        "When unsure, prefer 'unknown' with low confidence. For hazardous items, be conservative.",
      ].join(" "),
      visionSchema,
      { mimeType: mimeType === "jpg" ? "jpeg" : mimeType, data },
    );
    if (ai.data) {
      const limitations = [
        "AI vision classification — confidence reflects the model's certainty, not a laboratory analysis.",
      ];
      return buildOutput(ai.data.category, ai.data.label, ai.data.confidence, false, true, limitations);
    }
  }

  const seed = hashString(input.fileName ?? data.slice(0, 64));
  const pool = DEMO_WASTE_SAMPLES;
  const pick = pool[seed % pool.length];
  const confidence = 0.55 + ((seed % 20) / 100);
  return buildOutput(
    pick.category,
    `${pick.name} (demo match)`,
    confidence,
    true,
    false,
    [
      input.geminiConfigured
        ? "Vision model call failed — deterministic demo classification used instead."
        : "No vision model configured (GEMINI_API_KEY missing) — Demo Classification, not AI analysis of your image.",
      "Verify disposal with local municipal guidance.",
    ],
  );
}
