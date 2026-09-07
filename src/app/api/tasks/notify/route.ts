import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/serverAuth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const MANAGER_ROLES = ['founder', 'system_admin', 'c_suite', 'manager'];

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(`task_notify_${ip}`, { windowMs: 60 * 1000, max: 30 });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many notification requests. Please slow down." }, { status: 429 });
    }

    const { user, response: authResponse } = await requireAuth(req);
    if (!user) {
      return authResponse!;
    }

    const body = await req.json();
    const { action, taskId, taskData, newStatus, isRecheck } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    // DISCORD WEBHOOK helper with strict URL pattern check
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const sendDiscord = async (content: string) => {
      if (discordWebhookUrl && /^https:\/\/(?:[a-zA-Z0-9-]+\.)?discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/.test(discordWebhookUrl)) {
        await fetch(discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.substring(0, 2000) }),
        }).catch(console.error);
      }
    };

    if (action === "created" && taskData) {
      // Fetch the created task from Firestore to verify that it actually exists and verify caller
      const taskSnap = await adminDb.collection("tasks").doc(taskId).get();
      const realTask = taskSnap.exists ? taskSnap.data() : null;

      const title = (realTask?.title || taskData.title || "").substring(0, 200);
      const assignedTo = realTask?.assignedTo || taskData.assignedTo;
      const assignedBy = realTask?.assignedBy || taskData.assignedBy || user.uid;
      const priority = realTask?.priority || taskData.priority || "Medium";

      // Caller must be the assigner or a manager
      const isAuthorized = user.uid === assignedBy || MANAGER_ROLES.includes(user.role);
      if (!isAuthorized) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to send assignment notifications for this task." }, { status: 403 });
      }

      if (!assignedTo) {
        return NextResponse.json({ error: "Missing assignee ID" }, { status: 400 });
      }

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
      // Fetch task to know who to notify and verify caller permissions
      const taskSnap = await adminDb.collection("tasks").doc(taskId).get();
      if (!taskSnap.exists) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      const task = taskSnap.data()!;

      // Verify that caller is involved with the task (assignee, assigner, or manager)
      const isAssignee = task.assignedTo === user.uid;
      const isAssigner = task.assignedBy === user.uid;
      const isManager = MANAGER_ROLES.includes(user.role);

      if (!isAssignee && !isAssigner && !isManager) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to trigger notifications for this task." }, { status: 403 });
      }

      const batch = adminDb.batch();
      let discordMsg = "";
      
      if (newStatus === "review") {
        if (!task.assignedBy) {
          return NextResponse.json({ success: true, message: "No assigner to notify" });
        }
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
        if (!task.assignedTo) {
          return NextResponse.json({ success: true, message: "No assignee to notify" });
        }
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
        if (!task.assignedTo) {
          return NextResponse.json({ success: true, message: "No assignee to notify" });
        }
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
