import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyAuthUser } from "@/lib/serverAuth";

const DISCORD_WEBHOOK_REGEX = /^https:\/\/(?:[a-zA-Z0-9-]+\.)?discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(`alert_${ip}`, { windowMs: 60 * 1000, max: 20 });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many alert requests." }, { status: 429 });
    }

    // Check auth or allow system internal header
    const internalSecret = req.headers.get("x-internal-alert-secret");
    const isInternalValid = internalSecret && process.env.CRON_SECRET && internalSecret === process.env.CRON_SECRET;
    
    if (!isInternalValid) {
      const user = await verifyAuthUser(req);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const { content, embeds, eventType } = body;

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl || !DISCORD_WEBHOOK_REGEX.test(webhookUrl)) {
      console.warn("[discord-alert] DISCORD_WEBHOOK_URL is not configured or invalid.");
      return NextResponse.json(
        { error: "Discord webhook is not configured or invalid." },
        { status: 503 }
      );
    }

    // Build a sanitized payload
    const payload: Record<string, any> = {
      username: "Mints ERP Telemetry",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/2716/2716652.png",
      content: typeof content === 'string' ? content.substring(0, 2000) : null,
      ...(Array.isArray(embeds) && embeds.length > 0
        ? {
            embeds: embeds.slice(0, 5).map((e: any) => ({
              title: typeof e.title === 'string' ? e.title.substring(0, 256) : undefined,
              description: typeof e.description === 'string' ? e.description.substring(0, 2048) : undefined,
              color: typeof e.color === 'number' ? e.color : 0x6b7c4b,
              timestamp: new Date().toISOString(),
              footer: { text: "Mints Global ERP · Telemetry Engine" }
            }))
          }
        : {}),
    };

    if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
      payload.embeds = [{
        title: "⚡ ERP System Alert",
        description: eventType ? `Event type: \`${String(eventType).substring(0, 50)}\`` : "An unspecified system event was triggered.",
        color: 0x6b7c4b,
        timestamp: new Date().toISOString(),
        footer: { text: "Mints Global ERP · Telemetry Engine" }
      }];
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[discord-alert] Discord API responded ${response.status}: ${errText}`);
      return NextResponse.json(
        { error: `Discord responded with status ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, eventType: eventType || "generic" });
  } catch (error: any) {
    console.error("[discord-alert] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
