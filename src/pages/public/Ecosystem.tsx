import React, { useState, useLayoutEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import gsap from "gsap";
import { MENTORS } from "@/lib/mock-data/mentorsInfor";
import { MentorCard } from "@/components/ecosystem/MentorCard";
import { MentorSearchBar } from "@/components/ecosystem/MentorSearchBar";

export default function Ecosystem() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [visibleCount, setVisibleCount] = useState(5);


   const toggleSearchFilter = (value: string) => {
      setSearchTerm((prev) =>
         prev.toLowerCase() === value.toLowerCase() ? "" : value
      );
   };


  
  const megaMenuCategories = [
    { name: "Software Engineering", skills: ["Frontend Developer", "Backend Developer", "Fullstack Developer", "Mobile Developer", "DevOps Engineer"] },
    { name: "Data Science & AI", skills: ["AI Engineer", "Data Scientist", "Data Analyst", "Machine Learning", "Data Engineer"] },
    { name: "Design & UX", skills: ["UX Researcher", "UI/UX Designer", "Product Designer", "Graphic Designer"] },
    { name: "Product & Business", skills: ["Product Manager", "Business Analyst", "Scrum Master", "Project Manager"] }
  ];

  const filteredMentors = MENTORS.filter(mentor => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentor.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentor.expertise.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = activeCategory === "All Categories" ||
                           mentor.expertise.some(e => e.includes(activeCategory)) || 
                           megaMenuCategories.find(c => c.name === activeCategory)?.skills.some(s => mentor.expertise.includes(s));

    return matchesSearch && matchesCategory;
  });

  const displayedMentors = filteredMentors.slice(0, visibleCount);

  useLayoutEffect(() => {
    gsap.fromTo(".mentor-card-anim", 
      { y: 30, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out", clearProps: "all" }
    );
  }, [displayedMentors]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12 text-center">
           {/* <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 mb-6 uppercase tracking-widest">Global Network</div> */}
           <h1 className="text-4xl font-poppins font-bold text-slate-900 mb-4">The SkillBridge Mentorship</h1>
           <p className="text-slate-500 max-w-2xl mx-auto">Connecting you with industry mentors to accelerate your journey from learning to earning and unlock your full potential.
              </p>
        </header>

             {/* Reusable Search Bar + Suggested Keywords */}
             <MentorSearchBar
               searchTerm={searchTerm}
               setSearchTerm={setSearchTerm}
               activeCategory={activeCategory}
               setActiveCategory={setActiveCategory}
               showSuggestedKeywords={true}
             />

             {/* Layout: Sidebar Filter & Main Content */}
             <div className="flex flex-col lg:flex-row gap-10 items-start mt-8">
                {/* Left Sidebar (MentorCruise style) */}
                <div className="w-full lg:w-[280px] xl:w-[320px] flex-shrink-0 lg:sticky top-24 space-y-8 lg:max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pr-2 pb-10 hidden md:block">
                   
                   {/* Filter 1: Skills */}
                   <div className="space-y-4">
                      <h3 className="text-2xl font-poppins font-bold text-slate-900 border-b border-slate-200 pb-3">Skills</h3>
                      <Card className="bg-slate-900 border-none shadow-md text-white rounded-2xl overflow-hidden">
                         <CardContent className="p-5">
                            <div className="relative mb-5">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                               <Input className="bg-slate-800 border-none text-white placeholder:text-white/50 pl-9 rounded-xl h-10 w-full focus-visible:ring-1 focus-visible:ring-primary/50" placeholder="Search for skills" />
                            </div>
                            <div className="space-y-4">
                               {[
                                  { label: "AI", count: 193 },
                                  { label: "System Design", count: 127 },
                                  { label: "Frontend", count: 122 },
                                  { label: "Backend", count: 117 },
                                  { label: "Python", count: 106 },
                                  { label: "React", count: 102 }
                               ].map(skill => (
                                  <div key={skill.label} className="flex items-center justify-between group cursor-pointer">
                                     <div className="flex items-center gap-3">
                                        <Checkbox
                                          checked={searchTerm.toLowerCase() === skill.label.toLowerCase()}
                                          onCheckedChange={() => toggleSearchFilter(skill.label)}
                                          id={`skill-${skill.label}`}
                                          className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-slate-900 rounded-[4px] w-[18px] h-[18px]"
                                        />
                                        <label htmlFor={`skill-${skill.label}`} className="text-sm font-medium text-white/90 group-hover:text-primary transition-colors cursor-pointer">{skill.label}</label>
                                     </div>
                                     <span className="text-xs text-white/50 font-medium">{skill.count}</span>
                                  </div>
                               ))}
                            </div>
                            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mt-5 p-0 h-auto text-sm w-full font-bold justify-start">Show more</Button>
                         </CardContent>
                      </Card>
                   </div>

                   {/* Filter 2: Job titles */}
                   <div className="space-y-4">
                      <h3 className="text-2xl font-poppins font-bold text-slate-900 border-b border-slate-200 pb-3">Job titles</h3>
                      <Card className="bg-slate-900 border-none shadow-md text-white rounded-2xl overflow-hidden">
                         <CardContent className="p-5">
                            <div className="relative mb-5">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                               <Input className="bg-slate-800 border-none text-white placeholder:text-white/50 pl-9 rounded-xl h-10 w-full focus-visible:ring-1 focus-visible:ring-primary/50" placeholder="Search for job titles" />
                            </div>
                            <div className="space-y-4">
                               {[
                                  { label: "Founder", count: 139 },
                                  { label: "Sr. Frontend", count: 72 },
                                  { label: "Data Scientist", count: 52 },
                                  { label: "UX Researcher", count: 39 },
                                  { label: "Engineering Lead", count: 33 }
                               ].map(job => (
                                  <div key={job.label} className="flex items-center justify-between group cursor-pointer">
                                     <div className="flex items-center gap-3">
                                        <Checkbox
                                          checked={searchTerm.toLowerCase() === job.label.toLowerCase()}
                                          onCheckedChange={() => toggleSearchFilter(job.label)}
                                          id={`job-${job.label}`}
                                          className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-slate-900 rounded-[4px] w-[18px] h-[18px]"
                                        />
                                        <label htmlFor={`job-${job.label}`} className="text-sm font-medium text-white/90 group-hover:text-primary transition-colors cursor-pointer">{job.label}</label>
                                     </div>
                                     <span className="text-xs text-white/50 font-medium">{job.count}</span>
                                  </div>
                               ))}
                            </div>
                            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mt-5 p-0 h-auto text-sm w-full font-bold justify-start">Show more</Button>
                         </CardContent>
                      </Card>
                   </div>

                   {/* Filter 3: Experience Level */}
                   <div className="space-y-4">
                      <h3 className="text-2xl font-poppins font-bold text-slate-900 border-b border-slate-200 pb-3">Experience</h3>
                      <Card className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-5">
                         <div className="space-y-4">
                            {["Entry Level", "Mid Level", "Senior (5+ yrs)", "Staff/Principal", "Executive/CTO"].map(level => (
                               <div key={level} className="flex items-center gap-3 group cursor-pointer">
                                  <Checkbox id={`exp-${level}`} className="border-slate-300 rounded-[4px]" />
                                  <label htmlFor={`exp-${level}`} className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors cursor-pointer">{level}</label>
                               </div>
                            ))}
                         </div>
                      </Card>
                   </div>

                   {/* Filter 4: Company Tier */}
                   <div className="space-y-4">
                      <h3 className="text-2xl font-poppins font-bold text-slate-900 border-b border-slate-200 pb-3">Company Tier</h3>
                      <Card className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-5">
                         <div className="space-y-4">
                            {["FAANG", "Fortune 500", "Top Startups", "Unicorns"].map(tier => (
                               <div key={tier} className="flex items-center gap-3 group cursor-pointer">
                                  <Checkbox id={`tier-${tier}`} className="border-slate-300 rounded-[4px]" />
                                  <label htmlFor={`tier-${tier}`} className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors cursor-pointer">{tier}</label>
                               </div>
                            ))}
                         </div>
                      </Card>
                   </div>

                </div>

                {/* Main Content (Mentor Cards) */}
                <div className="flex-1 space-y-6 w-full">
                   <div className="flex items-center justify-between mb-4">
                     <div className="text-sm font-bold text-slate-500">{filteredMentors.length}+ mentors found</div>
                   </div>

                   {displayedMentors.map((mentor, i) => (
                     <MentorCard key={i} mentor={mentor} />
                   ))}

                   {visibleCount < filteredMentors.length && (
                      <div className="text-center py-8">
                        <Button 
                          variant="outline" 
                          onClick={() => setVisibleCount(prev => prev + 5)}
                          className="rounded-full px-8 py-6 font-bold shadow-sm hover:shadow-md border-slate-200 text-slate-700 bg-white"
                        >
                           Show More Mentors
                        </Button>
                      </div>
                   )}

                   {filteredMentors.length === 0 && (
                      <div className="text-center py-24 space-y-5 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                         <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto border border-slate-100 shadow-sm">
                            <Search className="w-10 h-10 text-primary/30" />
                         </div>
                         <div>
                            <h4 className="text-xl font-bold text-slate-700">No mentors found matching your criteria</h4>
                            <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">Try adjusting your category or searching for different keywords to find the perfect mentor.</p>
                         </div>
                         <Button variant="outline" onClick={() => {setSearchTerm(""); setActiveCategory("All Categories");}} className="rounded-xl border-slate-300 text-slate-600 font-semibold px-6 mt-2">Clear All Filters</Button>
                      </div>
                   )}
                </div>
             </div>
      </div>
    </Layout>
  );
}
