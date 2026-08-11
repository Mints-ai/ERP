"use client";

import { useAuth } from "@/context/AuthContext";
import TaskBoard from "@/components/tasks/TaskBoard";
import { Zap } from "lucide-react";

export default function TasksPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <div>Access Denied</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary fill-primary/10" />
          Task Board
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Manage your projects, assignments, and focus sessions.
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <TaskBoard />
      </div>
    </div>
  );
}
