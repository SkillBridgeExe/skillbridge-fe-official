import Navbar from "./Navbar";
import { useLocation, Link } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export default function Layout({ children, hideFooter = false }: LayoutProps) {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  
  // Hide footer on app pages automatically
  const isAppPage = ["/learning", "/diagnosis", "/dashboard", "/profile", "/interview", "/ecosystem", "/cv-builder"].some(
    path => location.pathname.startsWith(path)
  );
  const shouldHideFooter = hideFooter || isAppPage;

  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-slate-50/30 overflow-x-hidden relative">
      <Navbar />
      <main className={`flex-grow ${!isLanding ? 'pt-20' : ''}`}>
        {children}
      </main>
      {!shouldHideFooter && <footer className="bg-white border-t border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-0 mb-4">
               <span className="font-poppins font-black text-xl text-slate-900 leading-none tracking-tight">SkillBridge</span>
               <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5 mb-2.5" />
            </div>
            <p className="text-slate-500 text-sm">
              Bridging the gap between learning and earning with AI-powered career growth and skill matching.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/diagnosis" className="hover:text-primary transition-colors">Diagnosis</Link></li>
              <li><Link to="/learning" className="hover:text-primary transition-colors">Learning</Link></li>
              <li><Link to="/interview" className="hover:text-primary transition-colors">Interview</Link></li>
              <li><Link to="/ecosystem" className="hover:text-primary transition-colors">Ecosystem</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/success" className="hover:text-primary transition-colors">Success Stats</Link></li>
              <li><Link to="/testimonials" className="hover:text-primary transition-colors">Testimonials</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/community" className="hover:text-primary transition-colors">Community</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-50 mt-12 pt-8 flex items-center justify-between">
          <p className="text-xs text-slate-400">© 2026 SkillBridge. All rights reserved.</p>
        </div>
      </footer>}
    </div>
  );
}

