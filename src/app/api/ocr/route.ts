import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing. Please add it to .env.local" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o-mini for fast, cheap vision tasks
      messages: [
        {
          role: "system",
          content: "You are an AI assistant specialized in reading and extracting structured data from receipts and invoices. You MUST respond with ONLY valid JSON.",
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
      throw new Error("No content received from OpenAI");
    }

    // Parse the JSON response
    // Sometimes the model might still return markdown backticks despite instructions
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const extractedData = JSON.parse(cleanContent);

    return NextResponse.json({ success: true, data: extractedData });

  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process receipt" },
      { status: 500 }
    );
  }
}
