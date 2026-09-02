import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token); // Ensure user is authenticated

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const remarksRef = adminDb.collection(`tasks/${taskId}/remarks`);
    const snapshot = await remarksRef.orderBy("createdAt", "asc").get();

    const remarks = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ remarks });
  } catch (error: any) {
    console.error("Error fetching remarks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token); // Ensure user is authenticated

    const body = await req.json();
    const { taskId, content, userId, userName } = body;

    if (!taskId || !content || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify userId matches token
    if (userId !== decodedToken.uid) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    const remarksRef = adminDb.collection(`tasks/${taskId}/remarks`);
    
    const newRemark = {
      taskId,
      content,
      createdBy: userId,
      createdByName: userName || "User",
      createdAt: new Date().toISOString()
    };

    const docRef = await remarksRef.add(newRemark);

    return NextResponse.json({ id: docRef.id, ...newRemark });
  } catch (error: any) {
    console.error("Error adding remark:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
