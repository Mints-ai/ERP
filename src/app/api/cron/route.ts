import { NextResponse } from 'next/server';


import { addDays, isBefore } from 'date-fns';

// This is required to force Vercel to treat this as a dynamic endpoint for cron jobs
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Validate authorization (Optional: Vercel Cron adds a CRON_SECRET header)
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const today = new Date();
    const { adminDb, FieldValue } = await import('@/lib/firebaseAdmin');
    const batch = adminDb.batch();
    const notificationsRef = adminDb.collection('notifications');

    // 1. Check for Expiring HR Documents (e.g. Intern End Dates or Visas)
    // Here we'll mock an expiring check on `internEndDate`
    const nextWeek = addDays(today, 7);
    const expiringQuery = await adminDb
      .collection('employees')
      .where('isIntern', '==', true)
      .where('isActive', '==', true)
      .get();

    expiringQuery.docs.forEach((doc: any) => {
      const emp = doc.data();
      if (emp.internEndDate) {
        const endDate = new Date(emp.internEndDate);
        if (isBefore(endDate, nextWeek) && isBefore(today, endDate)) {
          // Add a notification for HR
          const notifRef = notificationsRef.doc();
          batch.set(notifRef, {
            title: 'Internship Expiring Soon',
            message: `${emp.fullName}'s internship ends on ${emp.internEndDate}.`,
            targetRoles: ['MANAGE_USERS'],
            createdAt: FieldValue.serverTimestamp(),
            readBy: [],
            link: `/dashboard/hr/${doc.id}`
          });
        }
      }
    });

    // 2. Check for Overdue Invoices (if they were stored in an 'invoices' collection)
    const invoicesQuery = await adminDb
      .collection('invoices')
      .where('status', '==', 'pending')
      .get();
      
    invoicesQuery.docs.forEach((doc: any) => {
      const invoice = doc.data();
      if (invoice.dueDate) {
        const dueDate = new Date(invoice.dueDate);
        if (isBefore(dueDate, today)) {
          const notifRef = notificationsRef.doc();
          batch.set(notifRef, {
            title: 'Invoice Overdue',
            message: `Invoice #${invoice.invoiceNumber || doc.id} is overdue.`,
            targetRoles: ['MANAGE_FINANCE'],
            createdAt: FieldValue.serverTimestamp(),
            readBy: [],
            link: `/dashboard/finance`
          });
          
          // Optionally auto-update status to overdue
          batch.update(doc.ref, { status: 'overdue' });
        }
      }
    });

    await batch.commit();

    return NextResponse.json({ success: true, message: 'Cron processed successfully' });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
