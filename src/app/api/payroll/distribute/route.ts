import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { runId, label, amount } = body;

    if (!runId || !label) {
      return NextResponse.json({ error: 'Missing runId or label' }, { status: 400 });
    }

    // 1. Send Discord Notification if Webhook URL is set
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const message = `💸 **Payroll Disbursed!** Cycle ${label} has been finalized. Total Disbursement: **${amount.toLocaleString()} AED**. Payslips are ready for download.`;
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message })
      });
    }

    // 2. Here you could iterate over `runDoc.records` and use Resend / SendGrid to email the generated PDFs directly.
    // For now, the Discord notification alerts employees to download from their portal.
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error distributing payroll:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
