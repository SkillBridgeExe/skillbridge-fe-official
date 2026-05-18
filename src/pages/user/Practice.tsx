import { useState, useRef, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Mic, Video, StopCircle, BarChart3, Clock, Smile, UserCheck, Sparkles, Play, type LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type MockStep = 'setup' | 'interviewing' | 'analysis';

export default function Practice() {
  const [step, setStep] = useState<MockStep>('setup');
  const [isRecording, setIsRecording] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startInterview = () => {
    setStep('interviewing');
    setIsRecording(true);
    setWebcamError(null);

    // Request webcam access (purely visual for demo)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(err => {
          console.error("Webcam error:", err);
          setWebcamError(err.name === 'NotFoundError' ? "Camera/Microphone not found. Proceeding in demo mode." : "Permissions denied. Proceeding in demo mode.");
        });
    } else {
      setWebcamError("Media devices not supported in this browser.");
    }
  };

  const stopInterview = () => {
    setIsRecording(false);
    // Stop tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setStep('analysis');
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
           <div>
              <h1 className="text-4xl font-poppins font-bold text-slate-900 mb-2">AI Mock Interview</h1>
              <p className="text-slate-500">Practice your speaking skills and get real-time facial expression analysis.</p>
           </div>
           {step === 'analysis' && (
             <Button onClick={() => setStep('setup')} variant="outline" className="rounded-full px-8">Try New Session</Button>
           )}
        </header>

        {step === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
             <div className="space-y-8 animate-in slide-in-from-left-8 duration-700">
                <div className="space-y-4">
                   <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-100 uppercase tracking-widest">Available Now</div>
                   <h2 className="text-3xl font-poppins font-bold text-slate-900 leading-tight">Prepare for Your <span className="text-primary italic">Frontend Engineer</span> Interview</h2>
                   <p className="text-slate-500 leading-relaxed">Our AI will ask you technical and behavioral questions based on your CV and recent learning modules. Get feedback on your tone, speed, and confidence.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
                      <Mic className="w-6 h-6 text-primary" />
                      <h4 className="font-bold text-slate-900">Audio Feedback</h4>
                      <p className="text-xs text-slate-400">Analysis of speaking speed, filler words, and tone.</p>
                   </div>
                   <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
                      <Video className="w-6 h-6 text-blue-400" />
                      <h4 className="font-bold text-slate-900">Visual Feedback</h4>
                      <p className="text-xs text-slate-400">Real-time facial expression and eye-contact tracking.</p>
                   </div>
                </div>

                <div className="pt-4">
                   <Button size="lg" className="rounded-full px-12 bg-primary hover:bg-primary/90 text-white shadow-glow" onClick={startInterview}>
                     Start Session <Play className="ml-2 w-4 h-4" />
                   </Button>
                </div>
             </div>
             
             <div className="relative animate-in slide-in-from-right-8 duration-700">
                <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
                <div className="glass rounded-3xl p-4 relative border border-white/50 shadow-2xl overflow-hidden aspect-[4/3] flex items-center justify-center bg-slate-50">
                   <div className="text-center space-y-4">
                      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto shadow-sm">
                        <Video className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-sm font-semibold text-slate-400">Setup your camera & microphone</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {step === 'interviewing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-[600px] animate-in fade-in duration-500">
             {/* Main Interview View */}
             <div className="lg:col-span-2 space-y-6">
                <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-slate-900 shadow-2xl">
                   {webcamError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 space-y-4">
                         <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center animate-pulse">
                            <Video className="w-10 h-10" />
                         </div>
                         <p className="text-sm font-medium">{webcamError}</p>
                         <p className="text-[10px] uppercase tracking-widest text-slate-500">Demo Simulation Active</p>
                      </div>
                   ) : (
                      <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted />
                   )}

                   <div className="absolute top-6 left-6 flex items-center gap-3">
                      <div className="px-4 py-2 bg-red-500/80 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        REC {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                      </div>
                   </div>

                   <div className="absolute bottom-6 left-6 right-6">
                      <div className="glass-dark rounded-2xl p-6 text-white border-white/10">
                         <div className="flex items-center gap-3 mb-2 text-primary">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Question 1/5</span>
                         </div>
                         <p className="text-lg font-bold leading-tight">"Tell me about a time you had to optimize a complex React component's performance. What steps did you take?"</p>
                      </div>
                   </div>
                </div>

                <div className="flex justify-center">
                   <Button size="lg" variant="destructive" className="rounded-full px-12 shadow-lg" onClick={stopInterview}>
                      End Session <StopCircle className="ml-2 w-4 h-4" />
                   </Button>
                </div>
             </div>

             {/* Real-time Analysis sidebar */}
             <div className="space-y-6">
                <Card className="glass border-white/50 shadow-sm overflow-hidden h-full flex flex-col">
                   <CardHeader className="border-b border-slate-100">
                      <CardTitle className="text-sm">Real-time Feedback</CardTitle>
                   </CardHeader>
                   <CardContent className="p-6 space-y-8 flex-grow">
                      <LiveMetric label="Speaking Speed" icon={Clock} value={65} status="Good" color="bg-emerald-500" />
                      <LiveMetric label="Confidence Score" icon={BarChart3} value={82} status="High" color="bg-primary" />
                      <LiveMetric label="Facial Positivity" icon={Smile} value={45} status="Neutral" color="bg-blue-400" />
                      
                      <div className="pt-6 space-y-4">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Insights</h4>
                         <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <p className="text-xs text-primary leading-relaxed font-medium">"You're maintaining great eye contact. Try reducing usage of 'um' and 'like' in technical explanations."</p>
                         </div>
                      </div>
                   </CardContent>
                </Card>
             </div>
          </div>
        )}

        {step === 'analysis' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ResultCard title="Overall Score" value="84%" icon={UserCheck} color="text-primary" />
                <ResultCard title="Tone Confidence" value="High" icon={BarChart3} color="text-emerald-500" />
                <ResultCard title="Clarity Score" value="7.5/10" icon={Clock} color="text-blue-500" />
                <ResultCard title="Facial Feedback" value="Positive" icon={Smile} color="text-indigo-500" />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="glass border-white/50 shadow-sm lg:col-span-8">
                   <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Detailed Performance Analysis</CardTitle>
                        <CardDescription>Breakdown of your mock session behavior</CardDescription>
                      </div>
                      <BarChart3 className="w-5 h-5 text-slate-400" />
                   </CardHeader>
                   <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Technical Delivery</h4>
                         <PerformanceMetric label="Concept Accuracy" value={90} />
                         <PerformanceMetric label="Problem Solving Logic" value={75} />
                         <PerformanceMetric label="System Thinking" value={60} />
                      </div>
                      <div className="space-y-6">
                         <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Communication Flow</h4>
                         <PerformanceMetric label="Articulation" value={85} />
                         <PerformanceMetric label="Listening / Response" value={95} />
                         <PerformanceMetric label="Filler Word Minimalist" value={40} />
                      </div>
                   </CardContent>
                </Card>

                <Card className="glass border-white/50 shadow-sm lg:col-span-4 bg-primary text-white">
                   <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        AI Feedback
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-6">
                      <p className="text-white/80 text-sm leading-relaxed italic">
                        "Your technical explanation of React hooks was excellent. However, your confidence dropped when discussing system architecture. We've added a new module on 'Scalable Frontend Architecture' to your roadmap to help you prepare better."
                      </p>
                      <div className="pt-4">
                         <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold">Adjust Roadmap</Button>
                      </div>
                   </CardContent>
                </Card>
             </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function LiveMetric({ label, icon: Icon, value, status, color }: { label: string, icon: LucideIcon, value: number, status: string, color: string }) {
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider">
             <Icon className="w-3.5 h-3.5" />
             {label}
          </div>
          <span className={cn("text-[10px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded", color.replace('bg-', 'text-'))}>{status}</span>
       </div>
       <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
       </div>
    </div>
  );
}

function ResultCard({ title, value, icon: Icon, color }: { title: string, value: string, icon: LucideIcon, color: string }) {
  return (
    <Card className="glass border-white/50 shadow-sm p-6 flex flex-col items-center text-center space-y-2 hover:translate-y-[-4px] transition-all">
       <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-2", color)}>
          <Icon className="w-6 h-6" />
       </div>
       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">{title}</h4>
       <p className="text-2xl font-black text-slate-900">{value}</p>
    </Card>
  );
}

function PerformanceMetric({ label, value }: { label: string, value: number }) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between items-center text-sm">
          <span className="font-semibold text-slate-600">{label}</span>
          <span className="text-primary font-bold">{value}%</span>
       </div>
       <Progress value={value} className="h-2 bg-slate-50" />
    </div>
  );
}
