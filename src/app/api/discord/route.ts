import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/serverAuth';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

const DISCORD_WEBHOOK_REGEX = /^https:\/\/(?:[a-zA-Z0-9-]+\.)?discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`discord_${ip}`, { windowMs: 60 * 1000, max: 30 });
    if (!limit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    // Require authenticated user
    const { user, response: authResponse } = await requireAuth(request);
    if (!user) {
      return authResponse!;
    }

    const body = await request.json();
    
    let webhookUrl = process.env.DISCORD_WEBHOOK_URL; // Default
    let isEventEnabled = true;

    // Load active settings dynamically from Firestore using adminDb (server-side secure)
    try {
      const docSnap = await adminDb.collection("settings").doc("discordWebhook").get();
      if (docSnap.exists) {
        const data = docSnap.data();
        
        let eventKey = body.eventType || "generic";
        if (eventKey === "hr") eventKey = "auth";
        
        // 1. Resolve specific channel webhook if configured, else fallback to global
        if (data?.urls && data.urls[eventKey]) {
          webhookUrl = data.urls[eventKey];
        } else if (data?.url) {
          webhookUrl = data.url;
        }
        
        // 2. Check if this specific event category is enabled
        if (data?.events && data.events[eventKey] !== undefined) {
          isEventEnabled = !!data.events[eventKey];
        }
      }
    } catch (fsErr) {
      console.warn("Firestore webhook settings load failed, falling back to environment parameters.", fsErr);
    }

    if (!isEventEnabled) {
      return NextResponse.json({ success: true, message: 'Event type has been muted by administrative settings.' });
    }

    if (!webhookUrl) {
      return NextResponse.json({ success: false, error: 'Discord webhook URL not configured.' }, { status: 500 });
    }

    // Strict URL validation to prevent SSRF against internal/cloud endpoints
    if (!DISCORD_WEBHOOK_REGEX.test(webhookUrl)) {
      console.error(`Blocked SSRF attempt with invalid webhook URL: ${webhookUrl}`);
      return NextResponse.json({ success: false, error: 'Configured Discord webhook URL is invalid.' }, { status: 400 });
    }

    // Clean up and sanitize payload
    const discordPayload: Record<string, any> = {
      username: "Mints ERP Telemetry",
    };

    if (typeof body.content === "string") {
      discordPayload.content = body.content.substring(0, 2000);
    }

    if (Array.isArray(body.embeds)) {
      discordPayload.embeds = body.embeds.slice(0, 5).map((embed: any) => ({
        title: typeof embed.title === 'string' ? embed.title.substring(0, 256) : undefined,
        description: typeof embed.description === 'string' ? embed.description.substring(0, 2048) : undefined,
        color: typeof embed.color === 'number' ? embed.color : 0x6b7c4b,
        timestamp: new Date().toISOString(),
        footer: { text: "Mints Global ERP · Security Telemetry" }
      }));
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord webhook error:", errorText);
      return NextResponse.json({ success: false, error: 'Failed to send Discord message' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in Discord API route:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
