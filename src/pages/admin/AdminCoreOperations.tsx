import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useState } from "react";

export default function AdminCoreOperations() {

  const [tab, setTab] = useState("roadmaps");

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-poppins">Core Operations Management</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage system workflows, roadmap engines, and matching algorithms.</div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full md:w-auto justify-start bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
          <TabsTrigger value="roadmaps">CV & Roadmap Engine</TabsTrigger>
          <TabsTrigger value="matching">Business Matching</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roadmaps" className="space-y-4">
          <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Roadmap Templates</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Intervene and adjust AI-generated roadmap templates for popular careers.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Mock templates */}
                {['Front-end Developer', 'Data Analyst', 'Product Manager'].map(role => (
                   <div key={role} className="border border-slate-200 dark:border-slate-700 p-4 rounded-xl hover:border-primary/50 cursor-pointer transition-colors">
                     <h4 className="font-bold text-slate-800 dark:text-slate-100">{role}</h4>
                     <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">12 modules · 4 assessments</div>
                     <div className="mt-4 text-primary text-sm font-semibold">Edit Template →</div>
                   </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matching" className="space-y-4">
          <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Automated Candidate Matching</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Monitor business records and auto-forwarded top candidates.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400">
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">Matching Analytics</p>
                List of active business recruitment records and contacted candidate status will appear here.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}