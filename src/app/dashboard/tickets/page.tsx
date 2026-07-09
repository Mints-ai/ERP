"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Clock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COLUMNS = [
  { id: "open", title: "Open Tickets", color: "border-rose-500/50 bg-rose-500/10" },
  { id: "in-progress", title: "In Progress", color: "border-amber-500/50 bg-amber-500/10" },
  { id: "resolved", title: "Resolved", color: "border-emerald-500/50 bg-emerald-500/10" },
];

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return; // Same column

    const ticketRef = doc(db, "tickets", draggableId);
    await updateDoc(ticketRef, { status: destination.droppableId });
  };

  const createTicket = async () => {
    const title = prompt("Ticket Title:");
    if (!title) return;
    await addDoc(collection(db, "tickets"), {
      title,
      description: "New support request",
      status: "open",
      createdBy: user?.uid,
      creatorName: user?.fullName || "User",
      createdAt: new Date().toISOString()
    });
  };

  const deleteTicket = async (id: string) => {
    if (confirm("Delete this ticket?")) {
      await deleteDoc(doc(db, "tickets", id));
    }
  };

  if (loading) return <div className="p-12 text-center text-foreground/50">Loading tickets...</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-500" /> Helpdesk Tickets
          </h1>
          <p className="text-xs text-foreground/40 mt-1">Manage internal IT and HR support requests.</p>
        </div>
        <Button onClick={createTicket} size="sm" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" /> New Ticket
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex flex-col gap-3">
              <div className={`p-3 rounded-xl border ${col.color}`}>
                <h2 className="text-sm font-bold uppercase tracking-wider">{col.title}</h2>
              </div>
              
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[400px] rounded-2xl p-2 transition-colors ${
                      snapshot.isDraggingOver ? "bg-secondary/50" : "bg-card border border-border"
                    }`}
                  >
                    <AnimatePresence>
                      {tickets.filter(t => t.status === col.id).map((ticket, index) => (
                        <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-3"
                              style={{ ...provided.draggableProps.style }}
                            >
                              <Card className={`border border-border shadow-sm rounded-xl overflow-hidden cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "ring-2 ring-primary shadow-xl" : ""}`}>
                                <CardContent className="p-4 relative">
                                  <h3 className="text-sm font-bold text-foreground mb-1 pr-6">{ticket.title}</h3>
                                  <p className="text-xs text-foreground/60">{ticket.creatorName}</p>
                                  
                                  <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[10px] flex items-center text-foreground/40 font-mono">
                                      <Clock className="h-3 w-3 mr-1" /> {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                    <button onClick={() => deleteTicket(ticket.id)} className="text-foreground/20 hover:text-red-500 transition-colors">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
