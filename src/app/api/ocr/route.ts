import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth } from "@/lib/serverAuth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_IMAGE_BASE64_LENGTH = 7 * 1024 * 1024; // Approx 5MB image

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(`ocr_${ip}`, { windowMs: 60 * 1000, max: 5 });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many OCR requests. Please wait a minute before scanning again." },
        { status: 429 }
      );
    }

    const { user, response: authResponse } = await requireAuth(req);
    if (!user) {
      return authResponse!;
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return NextResponse.json({ error: "Image file exceeds maximum allowable size (5MB)." }, { status: 413 });
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[ocr] OPENAI_API_KEY is not set — OCR service unavailable.");
      return NextResponse.json(
        {
          error: "OCR service is not configured. Please contact the administrator.",
          degraded: true,
        },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant specialized in reading and extracting structured data from receipts and invoices. You MUST respond with ONLY valid JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the total amount, date, and vendor name from this receipt. Return ONLY a JSON object with keys: 'amount' (number), 'date' (string YYYY-MM-DD), and 'vendor' (string). Do not wrap in markdown or backticks.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from OpenAI Vision");
    }

    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const extractedData = JSON.parse(cleanContent);

    return NextResponse.json({ success: true, data: extractedData });
  } catch (error: any) {
    console.error("[ocr] Error processing receipt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process receipt" },
      { status: 500 }
    );
  }
}
