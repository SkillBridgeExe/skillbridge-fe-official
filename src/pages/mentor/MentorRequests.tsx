import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Eye, Clock, Target, Briefcase, FileText, AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { MENTEE_REQUESTS, WAITING_PAYMENT_REQUESTS, MenteeRequest } from "@/lib/mock-data/mentor-dashboard";

export default function MentorRequests() {
  const [newRequests, setNewRequests] = useState<MenteeRequest[]>(MENTEE_REQUESTS);
  const [waitingRequests, setWaitingRequests] = useState<MenteeRequest[]>(WAITING_PAYMENT_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<MenteeRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleAccept = (req: MenteeRequest) => {
    setNewRequests(prev => prev.filter(r => r.id !== req.id));
    setWaitingRequests(prev => [...prev, { ...req, status: "accepted" }]);
    setShowDetail(false);
    toast({ title: "Request Accepted!", description: `${req.name} will be notified to complete the 90% payment.` });
  };

  const handleDecline = (req: MenteeRequest) => {
    setNewRequests(prev => prev.filter(r => r.id !== req.id));
    setShowDetail(false);
    toast({ title: "Request Declined", description: `Request from ${req.name} has been declined.`, variant: "destructive" });
  };

  const openDetail = (req: MenteeRequest) => {
    setSelectedRequest(req);
    setShowDetail(true);
  };

  return (
    <div className="w-full max-w-none space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-poppins font-bold text-slate-900 dark:text-white">Manage Requests</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Receive and process connection requests from students</p>
      </motion.div>

      <Tabs defaultValue="new">
        <TabsList className="bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <TabsTrigger value="new" className="rounded-lg data-[state=active]:bg-white dark:bg-slate-900 data-[state=active]:shadow-sm flex items-center gap-2">
            New Requests
            {newRequests.length > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-[20px] bg-red-500 dark:bg-red-500/100 text-white text-[11px] font-bold px-1.5 rounded-full ring-2 ring-white shadow-sm">{newRequests.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="waiting" className="rounded-lg data-[state=active]:bg-white dark:bg-slate-900 data-[state=active]:shadow-sm flex items-center gap-2">
            Pending Payment
            {waitingRequests.length > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-[20px] bg-red-500 dark:bg-red-500/100 text-white text-[11px] font-bold px-1.5 rounded-full ring-2 ring-white shadow-sm">{waitingRequests.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* New Requests Tab */}
        <TabsContent value="new" className="mt-5 space-y-4">
          {newRequests.length === 0 && (
            <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No new requests</p>
                <p className="text-sm text-slate-400 mt-1">All requests have been processed!</p>
              </CardContent>
            </Card>
          )}
          <AnimatePresence>
            {newRequests.map((req, idx) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, height: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{req.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-white">{req.name}</h3>
                          <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 border-blue-100 text-[10px]">10% Deposit paid</Badge>
                          <span className="text-xs text-slate-400">{req.requestedAt}</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5"> Goal: {req.goalRole} • {req.experience} experience</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 italic">"{req.message}"</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {req.skills.map(skill => (
                            <Badge key={skill} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 text-[10px]">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(req)}
                        className="gap-1.5 flex-1 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> View detailed CV & Roadmap
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(req)}
                        className="gap-1.5 flex-1 text-xs bg-primary hover:bg-primary/90"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecline(req)}
                        className="gap-1.5 text-xs text-red-500 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:bg-red-500/10"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </TabsContent>

        {/* Waiting Payment Tab */}
        <TabsContent value="waiting" className="mt-5 space-y-4">
          {waitingRequests.length === 0 && (
            <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
              <CardContent className="py-16 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No requests awaiting payment</p>
              </CardContent>
            </Card>
          )}
          <AnimatePresence>
            {waitingRequests.map((req, idx) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm border-l-4 border-l-amber-400">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-destructive text-white font-bold">{req.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-white">{req.name}</h3>
                          <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-500/20 text-[10px]">
                            <Clock className="w-3 h-3 mr-1" /> Pending Payment 90%
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5"> {req.goalRole}</p>
                        {req.sessionDate && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-500 font-semibold">
                              Booked schedule: {req.sessionDate} at {req.sessionTime}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-[#0b1120] rounded-xl text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      Awaiting student to complete 90% payment before session. "Join Call" will enable after payment.
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
              {selectedRequest && (
                <>
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{selectedRequest.initials}</AvatarFallback>
                  </Avatar>
                  Profile of {selectedRequest?.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4 pb-4">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-[#0b1120] rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Goal</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-primary" /> {selectedRequest.goalRole}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#0b1120] rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Experience</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-500" /> {selectedRequest.experience}
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-2">Message</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{selectedRequest.message}"</p>
                </div>

                {/* CV Summary */}
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> CV Summary (AI Analyzed)
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 rounded-xl p-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRequest.cvSummary}</p>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Current Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.skills.map(skill => (
                      <Badge key={skill} className="bg-primary/5 text-primary/90 border-primary/20">{skill}</Badge>
                    ))}
                  </div>
                </div>

                {/* Roadmap */}
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">AI Suggested Roadmap</p>
                  <div className="space-y-2">
                    {selectedRequest.roadmap.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-[#0b1120] rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleAccept(selectedRequest)}
                    className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Accept Request
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDecline(selectedRequest)}
                    className="flex-1 text-red-500 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:bg-red-500/10 gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Decline
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
