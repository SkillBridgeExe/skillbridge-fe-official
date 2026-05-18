import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Hammer } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderProps) {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 animate-pulse">
           <Hammer className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-poppins font-bold text-slate-900 mb-4">{title}</h1>
        <p className="text-slate-500 max-w-md mx-auto mb-10">{description}</p>
        <div className="flex gap-4">
          <Link to="/">
            <Button variant="outline" className="rounded-full px-8">Back to Home</Button>
          </Link>
          <Link to="/dashboard">
            <Button className="rounded-full px-8 bg-primary text-white hover:bg-primary/90">Go to Dashboard</Button>
          </Link>
        </div>
        <p className="mt-12 text-xs text-slate-400 font-medium uppercase tracking-widest">Under Construction</p>
      </div>
    </Layout>
  );
}
