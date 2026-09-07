import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth, logAuditRecord } from '@/lib/serverAuth';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

const FINANCE_ROLES = ['founder', 'system_admin', 'c_suite', 'manager'];

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`distribute_${ip}`, { windowMs: 60 * 1000, max: 10 });
    if (!limit.success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { user, response: authResponse } = await requireAuth(request, FINANCE_ROLES);
    if (!user) {
      return authResponse!;
    }

    const body = await request.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    // Server-side verification: Load true payroll run document from Firestore
    const runRef = adminDb.collection("payroll_runs").doc(runId);
    const runSnap = await runRef.get();

    if (!runSnap.exists) {
      return NextResponse.json({ error: 'Payroll run document does not exist' }, { status: 404 });
    }

    const runData = runSnap.data() || {};
    const label = `${runData.month || ''} ${runData.year || ''}`.trim() || 'Current Cycle';
    const records = runData.records || [];
    
    // Server-side derived total disbursement amount
    const verifiedAmount = runData.totalAmount || records.reduce((sum: number, r: any) => sum + (r.netPay || 0), 0);

    // 1. Send Discord Notification if Webhook URL is set
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl && /^https:\/\/(?:[a-zA-Z0-9-]+\.)?discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/.test(webhookUrl)) {
      const message = `💸 **Payroll Disbursed!** Cycle ${label} has been finalized. Total Disbursement: **${verifiedAmount.toLocaleString()} AED**. Payslips are ready for download.`;
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message })
      }).catch(err => console.error("Discord webhook dispatch error:", err));
    }

    // 2. Write immutable audit log
    await logAuditRecord({
      actorId: user.uid,
      action: 'DISTRIBUTE_PAYROLL',
      targetCollection: 'payroll_runs',
      description: `User ${user.email} triggered payroll disbursement announcement for run ${runId} (${label}, ${verifiedAmount} AED).`,
      metadata: { runId, label, totalDisbursement: verifiedAmount, recordCount: records.length }
    });
    
    return NextResponse.json({ success: true, verifiedAmount, label });
  } catch (error: any) {
    console.error("Error distributing payroll:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
