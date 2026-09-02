import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e: any) {
      console.error("Attendance verifyIdToken error:", e?.message || e);
      return NextResponse.json({ error: e?.message || "Invalid token" }, { status: 401 });
    }

    const { action, employeeName } = await req.json();
    const uid = decodedToken.uid;
    const now = new Date();
    const serverTimestamp = now.getTime();
    
    // Convert current server time to the local string for the log's `time` field
    // (This format is required by the UI for the "Clock In" and "Clock Out" tags)
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toISOString().split('T')[0];
    
    const docId = `${uid}_${dateString}`;
    const docRef = adminDb.collection("attendance").doc(docId);
    
    // We must read the current state to securely calculate elapsed time
    const docSnap = await docRef.get();
    let data: any = {};
    if (docSnap.exists) {
      data = docSnap.data();
    } else if (action !== "in") {
      return NextResponse.json({ error: "No active session found for today." }, { status: 400 });
    }

    const currentStatus = data.status || "out";
    const totalWorkingSeconds = data.totalWorkingSeconds || 0;
    const totalBreakSeconds = data.totalBreakSeconds || 0;
    const lastActionTimestamp = data.lastActionTimestamp || 0;
    const logs = data.logs || [];

    let newStatus = currentStatus;
    let newWorkingSeconds = totalWorkingSeconds;
    let newBreakSeconds = totalBreakSeconds;
    
    const newLog = {
      type: action === "resume" ? "in" : action,
      time: timeString,
      timestamp: now.toISOString(),
      label: ""
    };

    if (action === "in") {
      if (currentStatus === "in") return NextResponse.json({ error: "Already clocked in." }, { status: 400 });
      newStatus = "in";
      newLog.label = "Clocked In";
    } else if (action === "break") {
      if (currentStatus !== "in") return NextResponse.json({ error: "Not clocked in." }, { status: 400 });
      const elapsedWorking = lastActionTimestamp > 0 ? Math.max(0, Math.floor((serverTimestamp - lastActionTimestamp) / 1000)) : 0;
      newWorkingSeconds += elapsedWorking;
      newStatus = "break";
      newLog.label = "Lunch Break Start";
    } else if (action === "resume") {
      if (currentStatus !== "break") return NextResponse.json({ error: "Not on break." }, { status: 400 });
      const elapsedBreak = lastActionTimestamp > 0 ? Math.max(0, Math.floor((serverTimestamp - lastActionTimestamp) / 1000)) : 0;
      newBreakSeconds += elapsedBreak;
      newStatus = "in";
      newLog.label = "Lunch Break End";
    } else if (action === "out") {
      if (currentStatus === "out") return NextResponse.json({ error: "Already clocked out." }, { status: 400 });
      if (currentStatus === "in") {
        const elapsedWorking = lastActionTimestamp > 0 ? Math.floor((serverTimestamp - lastActionTimestamp) / 1000) : 0;
        newWorkingSeconds += Math.max(0, elapsedWorking);
      } else if (currentStatus === "break") {
        const elapsedBreak = lastActionTimestamp > 0 ? Math.floor((serverTimestamp - lastActionTimestamp) / 1000) : 0;
        newBreakSeconds += Math.max(0, elapsedBreak);
      }
      newStatus = "out";
      newLog.label = "Clocked Out";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const payload = {
      uid,
      employeeName: data.employeeName || employeeName || decodedToken.name || decodedToken.email || "Employee",
      date: dateString,
      status: newStatus,
      logs: [...logs, newLog],
      totalWorkingSeconds: newWorkingSeconds,
      totalBreakSeconds: newBreakSeconds,
      lastActionTimestamp: serverTimestamp,
    };

    await docRef.set(payload, { merge: true });

    return NextResponse.json({ success: true, payload });
  } catch (error: any) {
    console.error("Attendance API Error:", error);
    const isQuotaExceeded = error?.code === 8 || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota exceeded");
    const message = isQuotaExceeded
      ? "Firebase Firestore daily operations limit (free Spark tier) has been reached for project 'mintserp'. Please upgrade to the Firebase Blaze plan in Google Cloud / Firebase Console or wait for the quota to reset."
      : (error.message || "Internal Server Error");
    return NextResponse.json({ error: message, isQuotaExceeded }, { status: isQuotaExceeded ? 429 : 500 });
  }
}
