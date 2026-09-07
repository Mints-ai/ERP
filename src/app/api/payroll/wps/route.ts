import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth, logAuditRecord } from '@/lib/serverAuth';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ESTABLISHMENT_ID = "Mints-Global-001";
const ROUTING_CODE = "AE123456789";
const FINANCE_ROLES = ['founder', 'system_admin', 'c_suite', 'manager'];

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`wps_${ip}`, { windowMs: 60 * 1000, max: 10 });
    if (!limit.success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { user, response: authResponse } = await requireAuth(request, FINANCE_ROLES);
    if (!user) {
      return authResponse!;
    }

    const { searchParams } = new URL(request.url);
    const label = searchParams.get('label'); // e.g. "July 2026"

    if (!label) {
      return NextResponse.json({ error: 'Missing cycle label' }, { status: 400 });
    }

    const parts = label.trim().split(' ');
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Invalid cycle label format. Expected e.g. "July 2026"' }, { status: 400 });
    }
    const [month, year] = parts;

    const runsSnap = await adminDb.collection("payroll_runs")
      .where("month", "==", month)
      .where("year", "==", parseInt(year, 10))
      .get();

    if (runsSnap.empty) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    const runDoc = runsSnap.docs[0].data();
    const records = runDoc.records || [];
    
    // Log audit event for compliance
    await logAuditRecord({
      actorId: user.uid,
      action: 'EXPORT_WPS_SIF',
      targetCollection: 'payroll_runs',
      description: `User ${user.email} exported WPS SIF file for cycle ${label} (${records.length} employee records).`,
      metadata: { label, recordCount: records.length, userRole: user.role }
    });

    // WPS SIF Format Generation
    // 1. SCR (Salary Control Record)
    const creationDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const creationTime = new Date().toISOString().split('T')[1].replace(/:/g, '').substring(0,4);
    const totalAmount = records.reduce((sum: number, r: any) => sum + (r.netPay || 0), 0);
    
    let sifContent = `SCR,${ESTABLISHMENT_ID},${ROUTING_CODE},${creationDate},${creationTime},${month.substring(0,3)},${year},${records.length},${totalAmount},AED,PAYROLL-${month}-${year}\r\n`;

    // 2. EDR (Employee Detail Records)
    records.forEach((record: any) => {
      const empId = (record.userId || '').substring(0, 14);
      const bankRouting = ROUTING_CODE;
      const iban = record.iban || "UNKNOWN-IBAN";
      const startDate = "20260701";
      const endDate = "20260731";
      const daysOnLeave = record.unpaidLeaves || 0;
      const fixedPay = record.baseSalary || 0;
      const variablePay = (record.overtimePay || 0) + (record.bonuses || 0) + (record.expensesReimbursed || 0) + (record.gratuityPay || 0);
      const deductions = record.deductions || 0;
      const gpssa = 0;
      
      sifContent += `EDR,${empId},${bankRouting},${iban},${startDate},${endDate},${daysOnLeave},${fixedPay},${variablePay},0,${fixedPay},${variablePay},${deductions},${gpssa}\r\n`;
    });

    const response = new NextResponse(sifContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename=WPS_${label.replace(/\s+/g, '_')}.sif`);

    return response;
  } catch (error: any) {
    console.error("Error generating WPS file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
