import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Briefcase, BadgeCheck } from "lucide-react";

interface MentorPackage {
  price: string;
}

interface MentorSummary {
  name: string;
  image: string;
  rating: number;
  sessions: number;
  role: string;
  bio: string;
  expertise: string[];
  packages: MentorPackage[];
}

interface MentorProps {
  mentor: MentorSummary;
  onViewProfile?: (mentor: MentorSummary) => void;
}

export function MentorCard({ mentor }: MentorProps) {
  const navigate = useNavigate();
  const handleViewProfile = () => {
    const slug = mentor.name.toLowerCase().replace(/\s+/g, "-");
    navigate(`/ecosystem/mentor/${slug}`);
  };
  return (
    <Card className="flex flex-col md:flex-row bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-[28px] overflow-hidden mentor-card-anim relative group">
      {/* Left: Image */}
      <div className="w-full md:w-1/3 p-6 flex flex-col items-center justify-start bg-gradient-to-b from-slate-50 to-white border-r border-slate-100">
         <div className="w-40 h-40 rounded-2xl overflow-hidden mb-5 shadow-lg border-4 border-white relative group-hover:shadow-xl transition-all duration-300">
            <img src={mentor.image} alt={mentor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
         </div>
         <div className="text-center px-2">
           <div className="flex items-center justify-center gap-1.5 mb-2">
             <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
             <span className="font-bold text-slate-800 text-sm">{mentor.rating}</span>
             <span className="text-slate-500 text-sm">({mentor.sessions} Reviews)</span>
           </div>
         </div>
      </div>
      
      {/* Right: Info */}
      <div className="p-6 md:p-8 flex-grow flex flex-col justify-between">
         <div>
            <div className="flex flex-wrap items-center gap-3 mb-2 pr-40">
               <h3 className="text-2xl font-bold text-slate-900 font-poppins">{mentor.name}</h3>
               <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  <BadgeCheck className="w-3 h-3 text-blue-600" /> Top Mentor
               </Badge>
            </div>
            
            <div className="mb-5">
               <div className="flex items-center gap-2 text-slate-700 font-semibold mb-3 text-sm">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  {mentor.role}
               </div>
               <p className="text-primary font-semibold text-[13px] mb-3 border-l-2 border-primary/30 pl-3">Top 3% Mentor | 10+ Years of Industry Experience</p>
               <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                  {mentor.bio}
               </p>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
               {mentor.expertise.map((skill: string) => (
                  <span key={skill} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 transition-colors hover:bg-slate-200">
                     {skill}
                  </span>
               ))}
            </div>
         </div>
         
         {/* Bottom action row */}
         <div className="mt-4 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <div className="w-full sm:w-auto text-left">
               <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">Starting from</span>
               <div className="text-slate-900 font-black text-3xl font-poppins flex items-baseline gap-1">
                   ${Math.min(...mentor.packages.map((p) => parseInt(p.price, 10)))}<span className="text-sm font-medium text-slate-500 normal-case mb-1">/month</span>
               </div>
            </div>
            <Button className="w-full md:w-auto rounded-full px-10 py-6 bg-primary hover:bg-primary/90 text-white shadow-glow transition-all font-poppins text-[15px] font-bold" onClick={handleViewProfile}>
               View Profile
            </Button>
         </div>
      </div>
    </Card>
  );
}
