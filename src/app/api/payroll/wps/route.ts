import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// Mock values for WPS. In a real scenario, these would come from global settings.
const ESTABLISHMENT_ID = "Mints-Global-001";
const ROUTING_CODE = "AE123456789";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const label = searchParams.get('label'); // e.g. "July 2026"

    if (!label) {
      return NextResponse.json({ error: 'Missing cycle label' }, { status: 400 });
    }

    const [month, year] = label.split(' ');

    const runsSnap = await adminDb.collection("payroll_runs")
      .where("month", "==", month)
      .where("year", "==", parseInt(year, 10))
      .get();

    if (runsSnap.empty) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    const runDoc = runsSnap.docs[0].data();
    const records = runDoc.records || [];
    
    // WPS SIF Format Generation
    // 1. SCR (Salary Control Record)
    const creationDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const creationTime = new Date().toISOString().split('T')[1].replace(/:/g, '').substring(0,4);
    const totalAmount = records.reduce((sum: number, r: any) => sum + r.netPay, 0);
    
    let sifContent = `SCR,${ESTABLISHMENT_ID},${ROUTING_CODE},${creationDate},${creationTime},${month.substring(0,3)},${year},${records.length},${totalAmount},AED,PAYROLL-${month}-${year}\r\n`;

    // 2. EDR (Employee Detail Records)
    // EDR, Emp ID, Bank Routing, IBAN, StartDate, EndDate, DaysOnLeave, FixedPay, VariablePay, LeaveDays, FixedSalary, VariableSalary, Deductions, GPSSA
    records.forEach((record: any) => {
      const empId = record.userId.substring(0, 14); // Trim for WPS spec
      const bankRouting = ROUTING_CODE; // Assuming paid via same routing for simplicity
      const iban = record.iban || "UNKNOWN-IBAN";
      const startDate = "20260701"; // simplified
      const endDate = "20260731";   // simplified
      const daysOnLeave = record.unpaidLeaves || 0;
      const fixedPay = record.baseSalary || 0;
      const variablePay = (record.overtimePay || 0) + (record.bonuses || 0) + (record.expensesReimbursed || 0) + (record.gratuityPay || 0);
      const deductions = record.deductions || 0;
      const gpssa = 0; // Not calculated for non-gcc by default
      
      // We will output a simplified standard row
      sifContent += `EDR,${empId},${bankRouting},${iban},${startDate},${endDate},${daysOnLeave},${fixedPay},${variablePay},0,${fixedPay},${variablePay},${deductions},${gpssa}\r\n`;
    });

    const response = new NextResponse(sifContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename=WPS_${label.replace(' ', '_')}.sif`);

    return response;
  } catch (error: any) {
    console.error("Error generating WPS file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
