import React from "react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Building, DollarSign, Mail, MoreHorizontal, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generateQuote } from "@/lib/pdfGenerator";
import { updateLeadStage, deleteLead } from "@/lib/crm-services";

const STAGES = ["Lead", "Meeting", "Negotiation", "Won", "Lost"];

interface KanbanBoardProps {
  leads: any[];
  user: any;
  currentRole: string | null;
  setSelectedLead: (lead: any) => void;
}

export function KanbanBoard({ leads, user, currentRole, setSelectedLead }: KanbanBoardProps) {

  const handleGenerateQuote = (lead: any) => {
    generateQuote({
      quoteNumber: `Q-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toLocaleDateString(),
      clientName: lead.company,
      contactName: lead.contactName,
      items: [
        { description: "Standard Agency Retainer (Monthly)", amount: lead.value || 5000 }
      ],
      total: lead.value || 5000
    });
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm("Are you sure you want to delete this lead? This cannot be undone.")) {
      try {
        await deleteLead(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateStage = async (lead: any, stage: string) => {
    try {
      await updateLeadStage(lead, stage, user);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-x-auto pb-4 hide-scrollbar">
      <div className="flex gap-4 h-full min-w-max">
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage);
          
          return (
            <div key={stage} className="w-80 flex flex-col h-full border border-border rounded-2xl p-3">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-foreground tracking-tight uppercase text-sm flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${ stage === 'Won' ? 'bg-emerald-500' : stage === 'Lost' ? 'bg-rose-500' : 'bg-primary' }`} />
                  {stage}
                </h3>
                <Badge variant="secondary" className="text-foreground/80 border-border">{stageLeads.length}</Badge>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <AnimatePresence>
                  {stageLeads.map(lead => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={lead.id}
                      className="bg-card border border-border shadow-sm p-4 rounded-xl group hover:border-primary/30 transition-colors relative cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-foreground truncate pr-6">{lead.company}</h4>
                        
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1 hover:bg-muted rounded-md" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4 text-foreground/60" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleGenerateQuote(lead)}>
                                <FileText className="mr-2 h-4 w-4 text-primary" /> Generate Quote
                              </DropdownMenuItem>
                              {STAGES.map(s => s !== stage && (
                                <DropdownMenuItem key={s} onClick={() => handleUpdateStage(lead, s)}>
                                  Move to {s}
                                </DropdownMenuItem>
                              ))}
                              {(currentRole === "founder" || currentRole === "system_admin") && (
                                <DropdownMenuItem onClick={() => handleDeleteLead(lead.id)} className="text-red-400 focus:text-red-300">
                                  Delete Lead
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-xs text-foreground/60">
                        <p className="flex items-center gap-1.5">
                          <Building className="h-3 w-3 text-foreground/40" /> {lead.contactName}
                        </p>
                        {lead.email && (
                          <p className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-foreground/40" /> <span className="truncate">{lead.email}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 font-semibold text-primary/80 mt-2">
                          <DollarSign className="h-3 w-3 text-accent" /> 
                          {lead.value ? `${lead.value.toLocaleString()} AED` : 'TBD'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
