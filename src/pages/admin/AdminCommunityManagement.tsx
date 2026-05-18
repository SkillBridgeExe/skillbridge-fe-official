import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeCheck, AlertTriangle, EyeOff, Trash2, Flag, Search } from "lucide-react";
import AdminSideDrawer from "@/components/admin/AdminSideDrawer";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { useAuthStore } from "@/store/useAuthStore";

type PostStatus = "published" | "hidden";
type ReportStatus = "open" | "reviewed" | "dismissed";
type CommunityTab = "trending" | "reported";

type CommunityPost = {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  likes: number;
  reports: number;
  trendingScore: number;
  status: PostStatus;
};

type ReportRow = {
  id: string;
  postId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
};

const initialPosts: CommunityPost[] = [
  {
    id: "p1",
    author: "Mentor Tuan Anh",
    content:
      "Sharing a practical React checklist for interviews: component thinking, state boundaries, performance traps, and testing strategy. What helped you most recently?",
    likes: 182,
    reports: 2,
    trendingScore: 92,
    status: "published",
  },
  {
    id: "p2",
    author: "TechCorp Vietnam",
    content:
      "We’re hiring: Frontend Engineer (Remote). Requirements: TypeScript, React performance, and system design basics. Feel free to DM your CV for referral.",
    likes: 96,
    reports: 5,
    trendingScore: 78,
    status: "published",
  },
  {
    id: "p3",
    author: "User #4821",
    content:
      "Has anyone tried building a CV skill gap detector? I’m stuck on the evaluation part. Any recommendations or sample datasets?",
    likes: 44,
    reports: 12,
    trendingScore: 64,
    status: "published",
  },
  {
    id: "p4",
    author: "Mentor Alex",
    content:
      "Reminder: please avoid posting scam links. If you see suspicious content, report it with details so we can review quickly.",
    likes: 71,
    reports: 1,
    trendingScore: 58,
    status: "published",
  },
];

const initialReports: ReportRow[] = [
  { id: "r1", postId: "p2", reason: "Suspected job spam link", status: "open", createdAt: "12 minutes ago" },
  { id: "r2", postId: "p3", reason: "Off-topic & low-quality content", status: "open", createdAt: "40 minutes ago" },
  { id: "r3", postId: "p3", reason: "Potential policy violation", status: "reviewed", createdAt: "2 hours ago" },
  { id: "r4", postId: "p1", reason: "User reported misleading claim", status: "dismissed", createdAt: "4 hours ago" },
];

export default function AdminCommunityManagement() {
  const { currentUser } = useAuthStore();
  const [tab, setTab] = useState<CommunityTab>("trending");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [reports, setReports] = useState<ReportRow[]>(initialReports);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  const postById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);

  const visiblePosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = posts.filter((p) => {
      if (p.status !== "published") return false;
      const matchesQ = q.length === 0 ? true : `${p.author} ${p.content}`.toLowerCase().includes(q);
      return matchesQ;
    });
    if (tab === "trending") return [...filtered].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);
    // reported
    return [...filtered].sort((a, b) => b.reports - a.reports).slice(0, 6);
  }, [posts, tab, query]);

  const openPost = (p: CommunityPost) => {
    setSelectedPost(p);
    setDetailOpen(true);
  };

  const deletePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setReports((prev) => prev.filter((r) => r.postId !== id));
    toast({ title: "✅ Post deleted", description: "Community post removed (mock)." });
  };

  const hidePost = (id: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "hidden" } : p)));
    toast({ title: "✅ Post hidden", description: "Post is now hidden (mock)." });
  };

  const warnUser = (id: string) => {
    const p = posts.find((x) => x.id === id);
    toast({ title: "✅ Warning sent", description: `Warned ${p?.author ?? "user"} (mock).` });
  };

  const reportColumns = useMemo(() => {
    return [
      {
        key: "post",
        header: "Post",
        cell: (r: ReportRow) => {
          const p = postById.get(r.postId);
          return <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p?.author ?? r.postId}</div>;
        },
      },
      { key: "reason", header: "Reason", cell: (r: ReportRow) => <div className="text-sm text-slate-700">{r.reason}</div> },
      { key: "status", header: "Status", widthClassName: "w-32", cell: (r: ReportRow) => <AdminStatusBadge status={r.status} /> },
      { key: "createdAt", header: "Timestamp", widthClassName: "w-36", cell: (r: ReportRow) => <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.createdAt}</div> },
      {
        key: "actions",
        header: "Actions",
        widthClassName: "w-44",
        cell: (r: ReportRow) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-3"
              onClick={() => {
                setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "reviewed" } : x)));
                toast({ title: "✅ Marked reviewed", description: "Report updated (mock)." });
              }}
            >
              Review
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl px-2 text-red-600 hover:text-red-700"
              onClick={() => {
                setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "dismissed" } : x)));
                toast({ title: "✅ Dismissed", description: "Report dismissed (mock)." });
              }}
            >
              Dismiss
            </Button>
          </div>
        ),
      },
    ];
  }, [postById]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-poppins">Community Management</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Posts moderation and report handling (mock).
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Signed in as <span className="text-slate-900 dark:text-slate-100">{currentUser?.role}</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CommunityTab)}>
        <TabsList className="w-full justify-start bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="reported">Reported</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
            <div className="w-full lg:w-72">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Search</div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Author or content..."
                  className="w-full h-10 rounded-xl border border-slate-200/80 dark:border-slate-700 pl-9 pr-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Showing <span className="text-slate-900 dark:text-slate-100">{visiblePosts.length}</span> posts (mock).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {visiblePosts.map((p) => (
              <Card
                key={p.id}
                className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openPost(p)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.author}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Community post</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-1 rounded-full">
                        {p.trendingScore}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">{p.content}</div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <BadgeCheck className="w-4 h-4 text-primary" />
                      {p.likes} likes
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      {p.reports} reports
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl px-3 flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        hidePost(p.id);
                      }}
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        warnUser(p.id);
                      }}
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-xl px-2 text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePost(p.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Report Management</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review and resolve user reports (mock).</div>

            <div className="mt-3">
              <AdminDataTable<ReportRow>
                columns={reportColumns}
                rows={reports}
                loading={false}
                rowKey={(r) => r.id}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AdminSideDrawer
        open={detailOpen}
        onOpenChange={(v) => setDetailOpen(v)}
        title={selectedPost?.author ?? "Post detail"}
        description={selectedPost ? `Status: ${selectedPost.status}` : undefined}
      >
        {selectedPost ? (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Content</div>
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {selectedPost.content}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge status="reviewed" />
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {selectedPost.likes} likes · {selectedPost.reports} reports
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => {
                  toast({ title: "✅ Comment pinned", description: "Pinning comment (mock)." });
                }}
              >
                Pin comment
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => hidePost(selectedPost.id)}
              >
                Hide post
              </Button>
            </div>
          </div>
        ) : null}
      </AdminSideDrawer>
    </div>
  );
}

