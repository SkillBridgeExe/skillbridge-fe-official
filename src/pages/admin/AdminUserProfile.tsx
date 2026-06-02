import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MapPin, Phone, Star, ShieldCheck, ArrowLeft, MoreHorizontal, Calendar, Briefcase, Award, TrendingUp, Users, Activity } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MascotLoader } from '@/components/mascot/MascotLoader';

const mockRevenueData = [
  { month: 'Jan', revenue: 4000, bookings: 24 },
  { month: 'Feb', revenue: 3000, bookings: 18 },
  { month: 'Mar', revenue: 5000, bookings: 30 },
  { month: 'Apr', revenue: 4500, bookings: 27 },
  { month: 'May', revenue: 6000, bookings: 36 },
  { month: 'Jun', revenue: 5500, bookings: 33 },
];

export default function AdminUserProfile() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'user';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const profileRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (profileRef.current) {
        gsap.fromTo(
          profileRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
        );
      }
      if (statsRef.current) {
        gsap.fromTo(
          statsRef.current.children,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
        );
      }
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.4 }
        );
      }
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <MascotLoader message="Đang tải hồ sơ..." />
      </div>
    );
  }

  const formatRole = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);

  const getTabsByRole = (role: string) => {
    switch (role) {
      case 'mentor': 
        return [
          { id: 'profile', label: 'Profile' },
          { id: 'verification', label: 'Verification' },
          { id: 'booking', label: 'Booking' },
          { id: 'reviews', label: 'Reviews' },
          { id: 'revenue', label: 'Revenue' }
        ];
      case 'business':
        return [
          { id: 'profile', label: 'Profile' },
          { id: 'company_sub', label: 'Company & Subscriptions' },
          { id: 'candidates', label: 'Candidates List' },
          { id: 'hiring', label: 'Hiring Status' }
        ];
      case 'admin':
        return [
          { id: 'profile', label: 'Profile' },
          { id: 'permissions', label: 'Permissions' },
          { id: 'activity', label: 'Activity Log' }
        ];
      case 'user':
      default:
        return [
          { id: 'profile', label: 'Profile' },
          { id: 'cv', label: 'CV' },
          { id: 'roadmap', label: 'Roadmap' },
          { id: 'mentors', label: 'Mentors' },
          { id: 'interview', label: 'Interview' }
        ];
    }
  };

  const tabs = getTabsByRole(role);

  return (
    <div className="space-y-6 pb-20 font-sans">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin/users?role=' + role)} className="gap-2 rounded-xl">
          <ArrowLeft className="w-4 h-4" />
          Back to User Management
        </Button>
      </div>

      <Card ref={profileRef} className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-700 w-full relative">
          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center"></div>
        </div>
        <CardContent className="px-6 pb-6 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 mb-4">
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
              <AvatarImage src={`https://i.pravatar.cc/300?u=${id}`} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1 mt-16 md:mt-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Alex {formatRole(role)}</h1>
                {role === 'mentor' && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 rounded-full px-2.5">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                {formatRole(role)} at SkillBridge &bull; Joined August 2023
              </div>
              <div className="flex flex-wrap gap-4 text-sm mt-3 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Ho Chi Minh City, VN</div>
                <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {role}.demo@skillbridge.vn</div>
                <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> +84 90 123 4567</div>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button variant="outline" className="rounded-xl flex-1 md:flex-none">Send Message</Button>
              <Button className="rounded-xl flex-1 md:flex-none">Edit Profile</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem>Suspend User</DropdownMenuItem>
                  <DropdownMenuItem>Reset Password</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Delete Account</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {role === 'mentor' ? (
          <>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full">
                  <Star className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">4.9</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Average Rating</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">142</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Sessions Completed</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 bg-green-50 text-green-600 rounded-full">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">89</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Students</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">$24.5k</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Revenue</div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">4</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Courses Enrolled</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">12</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Mentor Sessions</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">Lv. 5</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Skill Level</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">85%</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Completion Rate</div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div ref={contentRef}>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 dark:border-slate-700 rounded-none h-auto p-0 mb-6 overflow-x-auto flex-nowrap hide-scrollbar">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-semibold">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {role === 'mentor'
                        ? 'An experienced professional in Product Management/Software Engineering. Worked at large tech corporations with over 10 years of practical experience. Joined SkillBridge to guide and provide career orientation for students and young professionals.'
                        : role === 'business'
                        ? 'Representative of SkillBridge\'s partner business. Specializes in finding and recruiting high-quality technology talents to participate in the company\'s strategic projects.'
                        : role === 'admin'
                        ? 'SkillBridge System Administrator. Operates and monitors all activities on the platform, ensures service quality and supports users when needed.'
                        : 'Technology enthusiast, currently a 3rd-year student majoring in Computer Science. Looking for internship opportunities and practical experience from Mentors to improve skills and build a solid career path.'
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardHeader>
                    <CardTitle>Performance Overview</CardTitle>
                    <CardDescription>Metrics spanning the last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                         <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                        <RechartsTooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          labelStyle={{fontWeight: 'bold', color: '#0f172a'}}
                        />
                        <Area type="monotone" dataKey={role === 'mentor' ? 'revenue' : 'bookings'} stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardHeader>
                    <CardTitle>Skills & Expertise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {['React', 'TypeScript', 'System Design', 'Agile', 'Product Strategy', 'Node.js', 'Mentorship'].map(skill => (
                         <Badge key={skill} variant="outline" className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                           {skill}
                         </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                          <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{role === 'mentor' ? 'Hosted 1:1 Session' : 'Completed Module 4'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{i * 2} days ago &bull; View details</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {tabs.filter(t => t.id !== 'profile').map(t => (
            <TabsContent key={t.id} value={t.id} className="mt-0">
              <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
                <CardContent className="p-20 text-center text-slate-500 dark:text-slate-400">
                  {t.label} data mapping goes here. (Mockup placeholder)
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
