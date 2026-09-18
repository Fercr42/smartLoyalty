import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError as GeminiApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { DocumentReference } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "../firebase/admin";
import { AI_DAILY_LIMIT } from "./ai-context";
import { PLAN_EXPIRED_MESSAGE, planState } from "./plan";

// Llamadas a la IA desde el servidor (las claves nunca llegan al navegador).
// AI_PROVIDER=gemini (por defecto, plan gratis de Google) o AI_PROVIDER=claude.

const PROVIDER = process.env.AI_PROVIDER === "claude" ? "claude" : "gemini";
const CLAUDE_MODEL = "claude-opus-5";
// Si Google retira un modelo, se prueba el siguiente. GEMINI_MODEL en Vercel fuerza uno.
const GEMINI_MODELS = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : ["gemini-3.6-flash", "gemini-flash-latest"];

export class AiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const fail = (error: string, status: number) => Response.json({ error }, { status });

const hasKey = () => Boolean(PROVIDER === "claude" ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY);

// Dueño con sesión, empresa registrada y plan vigente. Devuelve la empresa o la respuesta de error.
export async function aiOwner(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return fail("No autorizado", 401);
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return fail("Sesión inválida", 401);
  }
  const companyRef = adminDb().collection("companies").doc(uid);
  const company = await companyRef.get();
  if (!company.exists) return fail("Primero registra tu empresa", 400);
  if (!planState(company.data()?.plan).allowed) return fail(PLAN_EXPIRED_MESSAGE, 402);
  if (!hasKey()) return fail("La IA todavía no está configurada.", 503);
  return { uid, companyRef, company: company.data()! };
}

// Máximo de usos por día por restaurante (cuida el costo y los límites del plan gratis).
export async function takeAiCredit(companyRef: DocumentReference) {
  const ref = companyRef.collection("private").doc("aiUsage");
  const day = new Date().toISOString().slice(0, 10);
  return companyRef.firestore.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    const count = data?.day === day ? Number(data.count) || 0 : 0;
    if (count >= AI_DAILY_LIMIT) return false;
    tx.set(ref, { day, count: count + 1 });
    return true;
  });
}

const BUSY = "La IA está ocupada. Inténtalo en un minuto.";
const RETRY = "La IA no respondió. Inténtalo de nuevo.";

// Vercel corta a los 60 s: cada intento tiene su propio límite para que quepan dos modelos.
const GEMINI_TIMEOUT_MS = 25_000;

async function askGemini<T extends z.ZodType>(schema: T, system: string, content: string): Promise<z.infer<T>> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const deadline = Date.now() + 52_000;
  // Poco razonamiento: responde más rápido y para textos cortos alcanza.
  const attempts = GEMINI_MODELS.map((model) => ({ model, lowThinking: true }));
  for (let i = 0; i < attempts.length; i++) {
    const { model, lowThinking } = attempts[i];
    const last = i === attempts.length - 1;
    const timeout = Math.min(GEMINI_TIMEOUT_MS, deadline - Date.now());
    if (timeout < 5_000) break;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: content,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(schema),
          ...(lowThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          abortSignal: AbortSignal.timeout(timeout),
        },
      });
      const parsed = schema.safeParse(JSON.parse(response.text ?? "null"));
      if (!parsed.success) throw new AiError("La IA no pudo responder esta vez. Prueba escribirlo de otra forma.");
      return parsed.data;
    } catch (e) {
      if (e instanceof AiError) throw e;
      if (e instanceof SyntaxError) throw new AiError(RETRY);
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        console.error("Gemini tardó demasiado", model);
        if (!last) continue;
        throw new AiError(BUSY, 429);
      }
      if (e instanceof GeminiApiError) {
        // Un modelo que no acepta el nivel de razonamiento: se reintenta sin él.
        if (e.status === 400 && lowThinking && /thinking/i.test(e.message)) {
          attempts.splice(i + 1, 0, { model, lowThinking: false });
          continue;
        }
        // Modelo retirado o saturado (pasa seguido en el plan gratis): se prueba el siguiente.
        if ((e.status === 404 || e.status >= 500) && !last) continue;
        if (e.status === 429 || e.status === 503) throw new AiError(BUSY, 429);
        console.error("Gemini API", model, e.status, e.message);
        throw new AiError(RETRY);
      }
      throw e;
    }
  }
  throw new AiError(RETRY);
}

async function askClaude<T extends z.ZodType>(schema: T, system: string, content: string): Promise<z.infer<T>> {
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new AiError("La IA no pudo responder esta vez. Prueba escribirlo de otra forma.");
    }
    return response.parsed_output as z.infer<T>;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new AiError(BUSY, 429);
    if (e instanceof Anthropic.APIError) {
      console.error("Claude API", e.status, e.message);
      throw new AiError(RETRY);
    }
    throw e;
  }
}

export const askAi = <T extends z.ZodType>(schema: T, system: string, content: string) =>
  PROVIDER === "claude" ? askClaude(schema, system, content) : askGemini(schema, system, content);

export function aiErrorResponse(e: unknown) {
  if (e instanceof AiError) return fail(e.message, e.status);
  throw e;
}
