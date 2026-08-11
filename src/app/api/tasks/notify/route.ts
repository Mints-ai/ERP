import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, taskId, taskData, newStatus, isRecheck } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    // DISCORD WEBHOOK (Fallback to standard webhook if DISCORD_WEBHOOK_URL exists, or you could invoke internal discord logic)
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const sendDiscord = async (content: string) => {
      if (discordWebhookUrl) {
        await fetch(discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }).catch(console.error);
      } else {
        // Fallback: try calling the internal /api/discord if it exists (using localhost in dev, but absolute URL needed for fetch in API routes usually)
        // This is tricky in API routes. We will just log if no webhook URL is found.
        console.warn("DISCORD_WEBHOOK_URL not set in environment.");
      }
    };

    if (action === "created" && taskData) {
      const { title, assignedTo, assignedBy, priority } = taskData;
      
      const batch = adminDb.batch();
      
      // 1. In-App Notification
      const notificationRef = adminDb.collection("notifications").doc();
      batch.set(notificationRef, {
        userId: assignedTo,
        title: "New Task Assigned",
        message: `You have been assigned a new ${priority} priority task: ${title}`,
        type: "task_assignment",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        link: `/dashboard/tasks?taskId=${taskId}`
      });

      // 2. Internal Mail
      const mailRef = adminDb.collection("internal_mails").doc();
      batch.set(mailRef, {
        senderId: assignedBy,
        receiverId: assignedTo,
        subject: `[TASK] ${title}`,
        body: `You have been assigned a new task: ${title}. Please check your Task Board for details.`,
        isRead: false,
        createdAt: FieldValue.serverTimestamp()
      });

      await batch.commit();

      // 3. Discord Alert
      await sendDiscord(`🚨 **New Task Assigned!**\n**Task:** ${title}\n**Priority:** ${priority}\n**Assignee ID:** ${assignedTo}`);
      
      return NextResponse.json({ success: true });
    }

    if (action === "status_changed") {
      // Fetch task to know who to notify
      const taskSnap = await adminDb.collection("tasks").doc(taskId).get();
      if (!taskSnap.exists) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      const task = taskSnap.data();

      const batch = adminDb.batch();
      let discordMsg = "";
      
      if (newStatus === "review") {
        // Notify Assigner that task is ready for review
        const notificationRef = adminDb.collection("notifications").doc();
        batch.set(notificationRef, {
          userId: task.assignedBy,
          title: "Task Ready for Review",
          message: `Task "${task.title}" has been submitted for review by ${task.assignedToName || 'the assignee'}.`,
          type: "task_review",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
          link: `/dashboard/tasks?taskId=${taskId}`
        });
        discordMsg = `👀 **Task Ready for Review**\n**Task:** ${task.title}\n**Submitted by:** ${task.assignedToName || task.assignedTo}`;
      } else if (newStatus === "done") {
        // Notify Assignee that task is approved
        const notificationRef = adminDb.collection("notifications").doc();
        batch.set(notificationRef, {
          userId: task.assignedTo,
          title: "Task Approved",
          message: `Your task "${task.title}" has been approved and marked as Done!`,
          type: "task_approved",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
          link: `/dashboard/tasks?taskId=${taskId}`
        });
        discordMsg = `✅ **Task Completed & Approved**\n**Task:** ${task.title}`;
      } else if (isRecheck) {
         // Notify Assignee that task requires recheck
         const notificationRef = adminDb.collection("notifications").doc();
         batch.set(notificationRef, {
           userId: task.assignedTo,
           title: "Task Recheck Required",
           message: `Your task "${task.title}" has been sent back for recheck. Please review the remarks.`,
           type: "task_recheck",
           read: false,
           createdAt: FieldValue.serverTimestamp(),
           link: `/dashboard/tasks?taskId=${taskId}`
         });
         discordMsg = `⚠️ **Task Recheck Requested**\n**Task:** ${task.title}\n**Assignee:** ${task.assignedToName || task.assignedTo}`;
      }

      await batch.commit();
      
      if (discordMsg) {
        await sendDiscord(discordMsg);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Task notify error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
