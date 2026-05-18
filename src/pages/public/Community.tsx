import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  MoreHorizontal, 
  Search, 
  Filter, 
  TrendingUp, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  AtSign, 
  Sparkles,
  ChevronRight,
  Trophy,
  Users,
  UserPlus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  user: {
    name: string;
    role: string;
    image: string;
    isPro?: boolean;
  };
  time: string;
  content: string;
  tags: string[];
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  hasLiked?: boolean;
}

const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    user: { name: "Thanh Nguyen", role: "Frontend Developer @ VNG", image: "https://i.pravatar.cc/150?u=thanh", isPro: true },
    time: "2h ago",
      content: "I just passed a SkillBridge Mock Interview with a score of 8.5/10. Key takeaway: the System Design section is critical, so focus hard on scalability. The SkillBridge roadmap helped me prepare for exactly the right topics.",
    tags: ["Success Story", "Mock Interview", "Frontend"],
    stats: { likes: 124, comments: 18, shares: 5 }
  },
  {
    id: '2',
    user: { name: "Minh Tu", role: "UI/UX Designer", image: "https://i.pravatar.cc/150?u=tu" },
    time: "5h ago",
      content: "Can anyone recommend a Marketplace course on Accessibility (WCAG)? I need to upskill in this area to match a job description from a company in Singapore.",
    tags: ["Skill Gap", "Learning", "Accessibility"],
    stats: { likes: 45, comments: 32, shares: 2 }
  },
  {
    id: '3',
    user: { name: "Linh Do", role: "HR Manager @ FPT Software", image: "https://i.pravatar.cc/150?u=linh", isPro: true },
    time: "1d ago",
      content: "CV tip: do not just list technologies, focus on impact and outcomes. Use the Action + Context + Result structure. Example: 'Optimized React bundle size by 40% using code splitting'.",
    tags: ["CV Tips", "Recruitment", "Career Advice"],
    stats: { likes: 312, comments: 45, shares: 89 }
  }
];

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [newPostContent, setNewPostContent] = useState("");
  const { toast } = useToast();

  const handlePost = () => {
    if (!newPostContent.trim()) return;
    
    const newPost: Post = {
      id: Math.random().toString(),
      user: { name: "You", role: "Career Learner", image: "https://github.com/shadcn.png" },
      time: "Just now",
      content: newPostContent,
      tags: ["General"],
      stats: { likes: 0, comments: 0, shares: 0 }
    };
    
    setPosts([newPost, ...posts]);
    setNewPostContent("");
    toast({ title: "Post shared!", description: "Your experience is now live in the community feed." });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="text-center md:text-left">
              <h1 className="text-4xl font-poppins font-bold text-slate-900 mb-2 italic">The SkillBridge Community</h1>
              <p className="text-slate-500 max-w-xl">Share your journey, learn from others' successes, and build your professional network.</p>
           </div>
           <div className="flex gap-3">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                 <input 
                    className="pl-12 pr-6 py-3 rounded-full bg-white border border-slate-100 shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none w-64 transition-all"
                    placeholder="Search discussions..." 
                 />
              </div>
              <Button variant="outline" className="rounded-full px-6 border-slate-100"><Filter className="w-4 h-4 mr-2" /> Filters</Button>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Feed Content */}
          <main className="lg:col-span-8 space-y-8 animate-in fade-in duration-700">
             {/* Create Post Area */}
             <Card className="glass border-white/50 shadow-sm overflow-hidden group">
                <CardContent className="p-6">
                   <div className="flex gap-4">
                      <Avatar className="h-10 w-10 border border-primary/20">
                         <AvatarImage src="https://github.com/shadcn.png" />
                         <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow space-y-4">
                         <textarea 
                            className="w-full min-h-[100px] p-4 rounded-2xl border-none bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm resize-none placeholder:text-slate-400"
                            placeholder="Share your experience, tips, or ask a question..."
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                         />
                         <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                            <div className="flex gap-2">
                               <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5 text-slate-400 hover:text-primary"><ImageIcon className="w-4 h-4" /></Button>
                               <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5 text-slate-400 hover:text-primary"><LinkIcon className="w-4 h-4" /></Button>
                               <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5 text-slate-400 hover:text-primary"><AtSign className="w-4 h-4" /></Button>
                            </div>
                            <Button 
                               className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-white shadow-glow disabled:opacity-50"
                               onClick={handlePost}
                               disabled={!newPostContent.trim()}
                            >
                               Post Experience
                            </Button>
                         </div>
                      </div>
                   </div>
                </CardContent>
             </Card>

             {/* Feed Tabs */}
             <Tabs defaultValue="trending" className="space-y-6">
                <TabsList className="bg-transparent h-auto border-none p-0 gap-6">
                   <TabsTrigger value="trending" className="bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-10 font-bold text-slate-500">Trending</TabsTrigger>
                   <TabsTrigger value="latest" className="bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-10 font-bold text-slate-500">Latest Discussions</TabsTrigger>
                   <TabsTrigger value="following" className="bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-10 font-bold text-slate-500">Following</TabsTrigger>
                </TabsList>

                <TabsContent value="trending" className="space-y-6 mt-0">
                   {posts.map((post, i) => (
                     <PostCard key={post.id} post={post} delay={i * 100} />
                   ))}
                </TabsContent>
                
                <TabsContent value="latest" className="space-y-6 mt-0">
                   {posts.slice().reverse().map((post, i) => (
                     <PostCard key={post.id} post={post} delay={i * 100} />
                   ))}
                </TabsContent>
             </Tabs>
          </main>

          {/* Sidebar Section */}
          <aside className="lg:col-span-4 space-y-8 animate-in slide-in-from-right-8 duration-700">
             {/* Community Stats */}
             <Card className="glass border-white/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-tr from-primary/5 to-blue-400/5 pb-4 border-b border-slate-50">
                   <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" /> Community Growth
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                   <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-50">
                      <Users className="w-5 h-5 text-primary mx-auto mb-2" />
                      <span className="block text-xl font-black text-slate-900">4.8k+</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Members</span>
                   </div>
                   <div className="text-center p-4 bg-white rounded-2xl shadow-sm border border-slate-50">
                      <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                      <span className="block text-xl font-black text-slate-900">1.2k+</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Successes</span>
                   </div>
                </CardContent>
             </Card>

             {/* Trending Topics */}
             <Card className="glass border-white/50 shadow-sm">
                <CardHeader>
                   <CardTitle className="text-sm font-bold">Trending Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <TopicItem title="System Design Patterns" count={245} />
                   <TopicItem title="CV Refactor Tips" count={189} />
                   <TopicItem title="AWS Certification Path" count={156} />
                   <TopicItem title="Mock Interview Anxiety" count={124} />
                </CardContent>
                <div className="p-4 border-t border-slate-50 text-center">
                   <Button variant="ghost" className="text-xs text-primary font-bold hover:bg-primary/5 rounded-full w-full">View All Topics</Button>
                </div>
             </Card>

             {/* Top Contributors */}
             <Card className="glass border-white/50 shadow-sm overflow-hidden">
                <CardHeader>
                   <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Top Experts
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-slate-100 shadow-sm">
                               <AvatarImage src={`https://i.pravatar.cc/150?u=user${i}`} />
                               <AvatarFallback>U{i}</AvatarFallback>
                            </Avatar>
                            <div>
                               <h4 className="text-xs font-bold text-slate-900 leading-none">Expert Contributor</h4>
                               <p className="text-[10px] text-slate-400 font-medium">1.2k Points</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="rounded-full text-primary hover:bg-primary/10 h-8 w-8">
                            <UserPlus className="w-4 h-4" />
                         </Button>
                      </div>
                   ))}
                </CardContent>
             </Card>
          </aside>
        </div>
      </div>
    </Layout>
  );
}

function PostCard({ post, delay }: { post: Post, delay: number }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.stats.likes);

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <Card 
      className="glass border-white/50 shadow-sm hover:translate-y-[-2px] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4" 
      style={{ animationDelay: `${delay}ms` }}
    >
       <CardHeader className="p-6 pb-2">
          <div className="flex justify-between items-start">
             <div className="flex gap-3">
                <div className="relative">
                   <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm">
                      <AvatarImage src={post.user.image} />
                      <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                   </Avatar>
                   {post.user.isPro && (
                     <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-white">
                        <BadgeCheck className="w-2.5 h-2.5" />
                     </div>
                   )}
                </div>
                <div className="space-y-0.5">
                   <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{post.user.name}</h4>
                      {post.user.isPro && <span className="text-[8px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-1.5 py-0.5 rounded">PRO Member</span>}
                   </div>
                   <p className="text-[10px] text-slate-400 font-medium">{post.user.role} • {post.time}</p>
                </div>
             </div>
             <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-400 hover:bg-slate-50"><MoreHorizontal className="w-4 h-4" /></Button>
          </div>
       </CardHeader>
       <CardContent className="p-6 pt-2 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
             {post.content}
          </p>
          <div className="flex flex-wrap gap-2">
             {post.tags.map(tag => (
               <span key={tag} className="text-[9px] font-bold text-slate-500 bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-100 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">#{tag}</span>
             ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-50 pt-4">
             <div className="flex gap-4">
                <button 
                  onClick={toggleLike}
                  className={cn("flex items-center gap-1.5 text-xs font-bold transition-colors group", liked ? "text-primary" : "text-slate-400 hover:text-primary")}
                >
                   <Heart className={cn("w-4 h-4 group-hover:scale-125 transition-transform", liked && "fill-primary")} />
                   {likeCount}
                </button>
                <button className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors group">
                   <MessageSquare className="w-4 h-4 group-hover:scale-125 transition-transform" />
                   {post.stats.comments}
                </button>
                <button className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors group">
                   <Share2 className="w-4 h-4 group-hover:scale-125 transition-transform" />
                   {post.stats.shares}
                </button>
             </div>
             <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold uppercase tracking-widest group cursor-pointer hover:text-primary">
                Learn more <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
             </div>
          </div>
       </CardContent>
    </Card>
  );
}

function TopicItem({ title, count }: { title: string, count: number }) {
  return (
    <div className="flex justify-between items-center group cursor-pointer">
       <span className="text-xs font-bold text-slate-600 group-hover:text-primary transition-colors">#{title}</span>
       <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-50 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
          <MessageSquare className="w-2.5 h-2.5 text-slate-300 group-hover:text-primary" />
          <span className="text-[10px] font-black text-slate-400 group-hover:text-primary">{count}</span>
       </div>
    </div>
  );
}

function BadgeCheck({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
