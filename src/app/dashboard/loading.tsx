import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">
        Loading Mints Global ERP...
      </p>
    </div>
  );
}
