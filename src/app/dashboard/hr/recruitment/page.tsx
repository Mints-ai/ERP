"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { JobPosting, Candidate, CandidateStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, Search, ChevronRight, UserPlus, Mail, Phone, ExternalLink, Calendar, MapPin } from "lucide-react";
import { CreateJobDialog } from "./components/CreateJobDialog";
import { AddCandidateDialog } from "./components/AddCandidateDialog";
import { canAccess } from "@/lib/permissions";

const STAGES: CandidateStatus[] = ["Applied", "Screening", "Interviewing", "Offered", "Hired", "Rejected"];

export default function RecruitmentPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);

  useEffect(() => {
    if (!canAccess(role, "MANAGE_USERS")) return;

    // Fetch Jobs
    const qJobs = query(collection(db, "jobs"));
    const unsubJobs = onSnapshot(qJobs, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JobPosting[];
      // Sort by newest
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setJobs(list);
      if (list.length > 0 && !selectedJobId) {
        setSelectedJobId(list[0].id);
      }
    });

    // Fetch Candidates
    const qCandidates = query(collection(db, "candidates"));
    const unsubCandidates = onSnapshot(qCandidates, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Candidate[];
      setCandidates(list);
    });

    return () => {
      unsubJobs();
      unsubCandidates();
    };
  }, [role, selectedJobId]);

  const selectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId) || null, [jobs, selectedJobId]);
  
  // Filter candidates for selected job
  const jobCandidates = useMemo(() => {
    return candidates.filter(c => c.jobId === selectedJobId);
  }, [candidates, selectedJobId]);

  const handleAdvanceStatus = async (candidate: Candidate) => {
    const currentIndex = STAGES.indexOf(candidate.status);
    if (currentIndex >= 0 && currentIndex < STAGES.length - 2) { // Cannot automatically advance to Hired or Rejected like this
      const nextStatus = STAGES[currentIndex + 1];
      try {
        await updateDoc(doc(db, "candidates", candidate.id), { status: nextStatus });
        showToast(`${candidate.fullName} moved to ${nextStatus}`, "success");
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleReject = async (candidate: Candidate) => {
    if (!confirm(`Are you sure you want to reject ${candidate.fullName}?`)) return;
    try {
      await updateDoc(doc(db, "candidates", candidate.id), { status: "Rejected" });
      showToast(`${candidate.fullName} rejected`, "info");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  if (!canAccess(role, "MANAGE_USERS")) {
    return <div className="p-8 text-center text-foreground/50">You do not have permission to access the ATS.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Applicant Tracking</h1>
          <p className="text-foreground/50 mt-1">Manage job postings and candidates.</p>
        </div>
        
        <Button onClick={() => setCreateJobOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          <Briefcase className="w-4 h-4 mr-2" /> Post New Job
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar: Jobs List */}
        <div className="w-full lg:w-1/4 space-y-4">
          <h2 className="text-sm font-bold text-foreground/50 uppercase tracking-widest px-1">Active Roles</h2>
          {jobs.length === 0 ? (
            <div className="text-sm text-foreground/50 p-4 border border-border rounded-xl bg-muted/20 text-center">
              No jobs posted yet.
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedJobId === job.id 
                      ? 'bg-primary/10 border-primary shadow-sm' 
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-foreground truncate block pr-2">{job.title}</span>
                    <Badge variant="outline" className={`text-xs ${job.status === 'Open' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500'}`}>
                      {job.status}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-foreground/60 gap-3 mt-2">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || 'Remote'}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.department}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content: Kanban Board */}
        <div className="w-full lg:w-3/4 flex flex-col h-[calc(100vh-180px)] min-h-[600px]">
          {selectedJob ? (
            <Card className="flex-1 bg-card border-border flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/20 pb-4 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{selectedJob.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span>{selectedJob.department}</span> • <span>{selectedJob.type}</span>
                    </CardDescription>
                  </div>
                  <Button onClick={() => setAddCandidateOpen(true)} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                    <UserPlus className="w-4 h-4 mr-2" /> Add Candidate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-x-auto">
                <div className="flex h-full min-w-max p-4 gap-4">
                  {/* Pipeline Columns */}
                  {STAGES.slice(0, 5).map(stage => (
                    <div key={stage} className="w-80 flex flex-col bg-muted/10 rounded-xl border border-border/50 h-full overflow-hidden">
                      <div className="p-3 border-b border-border bg-muted/30 font-bold text-sm flex justify-between items-center text-foreground/80">
                        {stage}
                        <Badge variant="secondary" className="bg-background">{jobCandidates.filter(c => c.status === stage).length}</Badge>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {jobCandidates.filter(c => c.status === stage).map(candidate => (
                          <div key={candidate.id} className="bg-card border border-border p-3 rounded-lg shadow-sm hover:border-primary/40 transition-colors group">
                            <h4 className="font-semibold text-foreground text-sm">{candidate.fullName}</h4>
                            <div className="flex items-center gap-1 text-xs text-foreground/50 mt-1">
                              <Mail className="w-3 h-3" /> {candidate.email}
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                              {candidate.resumeUrl ? (
                                <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                  Resume <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : <span className="text-xs text-foreground/30">No resume</span>}
                              
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {stage !== "Hired" && (
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-foreground/40 hover:text-red-500" onClick={() => handleReject(candidate)}>
                                    <span className="text-[10px]">✕</span>
                                  </Button>
                                )}
                                {stage !== "Hired" && stage !== "Offered" && (
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-foreground/40 hover:text-emerald-500 bg-primary/5" onClick={() => handleAdvanceStatus(candidate)}>
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                )}
                                {stage === "Offered" && (
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" 
                                    onClick={async () => {
                                      await updateDoc(doc(db, "candidates", candidate.id), { status: "Hired" });
                                      showToast(`${candidate.fullName} Hired!`, "success");
                                    }}
                                  >
                                    Hire
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Rejected Column */}
                  <div className="w-72 flex flex-col bg-red-950/5 rounded-xl border border-red-900/10 h-full overflow-hidden opacity-70 hover:opacity-100 transition-opacity">
                    <div className="p-3 border-b border-red-900/10 bg-red-900/5 font-bold text-sm flex justify-between items-center text-red-500/70">
                      Rejected
                      <Badge variant="secondary" className="bg-background text-red-500">{jobCandidates.filter(c => c.status === "Rejected").length}</Badge>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                      {jobCandidates.filter(c => c.status === "Rejected").map(candidate => (
                        <div key={candidate.id} className="bg-card/50 border border-border p-3 rounded-lg shadow-sm">
                          <h4 className="font-semibold text-foreground/70 text-sm line-through decoration-red-500/30">{candidate.fullName}</h4>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex-1 border border-dashed border-border rounded-xl flex items-center justify-center text-foreground/40">
              Select a job to view candidates
            </div>
          )}
        </div>
      </div>

      <CreateJobDialog open={createJobOpen} onOpenChange={setCreateJobOpen} />
      <AddCandidateDialog open={addCandidateOpen} onOpenChange={setAddCandidateOpen} job={selectedJob} />
    </div>
  );
}
