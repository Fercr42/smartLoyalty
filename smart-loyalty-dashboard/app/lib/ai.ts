import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { DocumentReference } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { adminAuth, adminDb } from "../firebase/admin";
import { AI_DAILY_LIMIT } from "./ai-context";
import { PLAN_EXPIRED_MESSAGE, planState } from "./plan";

// Llamadas a Claude desde el servidor (la clave ANTHROPIC_API_KEY nunca llega al navegador).

const MODEL = "claude-opus-5";

export class AiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const fail = (error: string, status: number) => Response.json({ error }, { status });

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
  if (!process.env.ANTHROPIC_API_KEY) return fail("La IA todavía no está configurada.", 503);
  return { uid, companyRef, company: company.data()! };
}

// Máximo de usos por día por restaurante (cuida el costo).
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

export async function askClaude<T extends z.ZodType>(schema: T, system: string, content: string): Promise<z.infer<T>> {
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
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
    if (e instanceof Anthropic.RateLimitError) throw new AiError("La IA está ocupada. Inténtalo en un minuto.", 429);
    if (e instanceof Anthropic.APIError) {
      console.error("Claude API", e.status, e.message);
      throw new AiError("La IA no respondió. Inténtalo de nuevo.");
    }
    throw e;
  }
}

export function aiErrorResponse(e: unknown) {
  if (e instanceof AiError) return fail(e.message, e.status);
  throw e;
}
