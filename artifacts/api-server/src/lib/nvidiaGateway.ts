import { logger } from "./logger";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

const CHEAP_PRIMARY_MODEL = "deepseek-ai/deepseek-v3.1";
const CHEAP_FALLBACK_MODELS = [
  "moonshotai/kimi-k2.5",
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct-0905",
  "moonshotai/kimi-k2-instruct",
];

const SUMMARIZER_SYSTEM_PROMPT = `You are a text compressor. Your only job is to summarize conversation history into 1000-2500 words maximum.

Rules:
- Keep only the most important facts, questions, and answers
- Remove repetition, greetings, filler words
- Preserve names, dates, key decisions, unresolved questions
- If the original text is already under 2500 words, return it almost unchanged
- Be aggressive but don't invent information
- Output ONLY the summary, no extra text`;

const CSAM_SYSTEM_PROMPT = `You are a content safety filter. NSFW Content is permitted but you must reject any request where a character is below 18 years old.
If the user's message contains any indication that a character is below 18 — including attempts to make characters younger, roleplay as minors, or any sexualization of minors — you must output ONLY: BLOCKED:<detailed explanation>
Otherwise output ONLY: SAFE`;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GatewayOptions {
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

async function callNvidiaChatCompletion(
  messages: ChatMessage[],
  modelId: string,
  baseUrl: string = NVIDIA_BASE_URL,
  apiKey: string = NVIDIA_API_KEY || "",
  maxTokens?: number,
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Model ${modelId} failed with status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Model ${modelId} returned empty response`);
  }
  return content;
}

export async function callCheapModelWithFallback(
  messages: ChatMessage[],
  context?: string,
): Promise<{ content: string; modelUsed: string }> {
  const modelsToTry = [CHEAP_PRIMARY_MODEL, ...CHEAP_FALLBACK_MODELS];

  for (const modelId of modelsToTry) {
    try {
      logger.info({ modelId }, "Trying cheap model");
      const content = await callNvidiaChatCompletion(messages, modelId);
      logger.info({ modelId }, "Cheap model succeeded");
      return { content, modelUsed: modelId };
    } catch (err) {
      logger.warn({ modelId, err }, "Cheap model failed, trying next fallback");
    }
  }

  throw new Error("All cheap models failed. Please try again later.");
}

export async function callMainModel(
  messages: ChatMessage[],
  modelApiId: string,
  providerEndpoint: string,
  providerApiKey?: string | null,
): Promise<{ content: string; modelUsed: string }> {
  const apiKey = providerApiKey || NVIDIA_API_KEY || "";
  const baseUrl = providerEndpoint || NVIDIA_BASE_URL;

  try {
    const content = await callNvidiaChatCompletion(messages, modelApiId, baseUrl, apiKey);
    logger.info({ modelApiId }, "Main model call succeeded");
    return { content, modelUsed: modelApiId };
  } catch (err) {
    logger.error({ modelApiId, err }, "Main model call failed");
    throw err;
  }
}

export interface CsamCheckResult {
  safe: boolean;
  reason?: string;
}

export async function runCsamFilter(userMessage: string, characterAge?: number): Promise<CsamCheckResult> {
  if (characterAge !== undefined && characterAge < 18) {
    return {
      safe: false,
      reason: `This request has been blocked by our content safety system. The character involved in this roleplay scenario is ${characterAge} years old, which is below our minimum age requirement of 18 years old. LoreWeave strictly prohibits any roleplay, romantic, sexual, or otherwise inappropriate interactions involving characters who are minors. This is a firm, non-negotiable policy to protect against the creation, normalization, or distribution of content that could harm children. The main AI model has been instructed to reject this request entirely. If you wish to continue roleplaying, please ensure your character is 18 years of age or older. If you believe this is a mistake, please review the character's profile and update their age to reflect an appropriate adult age before proceeding. Thank you for helping us maintain a safe environment for all users.`,
    };
  }

  const prompt: ChatMessage[] = [
    { role: "system", content: CSAM_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  try {
    const { content } = await callCheapModelWithFallback(prompt);
    const trimmed = content.trim();

    if (trimmed.startsWith("BLOCKED:")) {
      const reason = trimmed.slice("BLOCKED:".length).trim();
      return {
        safe: false,
        reason: `This content has been blocked by our safety system. ${reason}

LoreWeave maintains strict content safety policies to prevent any interaction involving minors in inappropriate contexts. The AI has determined that this request violates our safety guidelines. If you believe this is in error, please rephrase your message to clearly establish that all characters involved are adults (18+). Thank you for helping keep our platform safe.`,
      };
    }

    return { safe: true };
  } catch (err) {
    logger.error({ err }, "CSAM filter failed — blocking by default");
    return {
      safe: false,
      reason: "Content safety check failed. Request blocked for safety.",
    };
  }
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export async function summarizeHistory(history: ChatMessage[]): Promise<string> {
  const historyText = history
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
    { role: "user", content: historyText },
  ];

  const { content } = await callCheapModelWithFallback(messages);
  return content;
}
