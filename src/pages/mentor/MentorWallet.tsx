import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight,
  Building2, CheckCircle2, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { WALLET_TRANSACTIONS } from "@/lib/mock-data/mentor-dashboard";

export default function MentorWallet() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, _setBankName] = useState("Vietcombank");
  const [bankAccount, _setBankAccount] = useState("****1234");

  const balance = WALLET_TRANSACTIONS.reduce((sum, tx) => {
    if (tx.status !== "completed") return sum;
    return tx.type === "earning" ? sum + tx.amount : sum - tx.amount;
  }, 0);

  const totalEarned = WALLET_TRANSACTIONS.filter(t => t.type === "earning" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = WALLET_TRANSACTIONS.filter(t => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + t.amount, 0);

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount.replace(/\D/g, ""));
    if (!amount || amount > balance) {
      toast({ title: "Error", description: "Invalid amount or exceeds balance.", variant: "destructive" });
      return;
    }
    setShowWithdraw(false);
    toast({ title: " Withdrawal request sent!", description: `₫${amount.toLocaleString()} will be sent to ${bankName} ${bankAccount} within 1-2 business days.` });
  };

  // Monthly earnings chart data (last 6 months)
  const monthlyData = [
    { month: "T10", amount: 1350000 },
    { month: "T11", amount: 2250000 },
    { month: "T12", amount: 1800000 },
    { month: "T1", amount: 3150000 },
    { month: "Mon", amount: 2700000 },
    { month: "Tue", amount: 2700000 },
  ];
  const maxAmount = Math.max(...monthlyData.map(d => d.amount));

  return (
    <div className="w-full max-w-none space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-slate-900 dark:text-white">Wallet & Earnings</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage balance and transaction history</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Export statement
          </Button>
        </div>
      </motion.div>

      {/* Balance Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-primary p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white dark:bg-slate-900/10 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white dark:bg-slate-900/10 rounded-full translate-y-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-white/80" />
                <span className="text-white/80 text-sm font-semibold">Available Balance</span>
              </div>
              <p className="text-5xl font-black font-poppins">₫{balance.toLocaleString()}</p>
              <p className="text-white/60 text-sm mt-1">Last updated: Today</p>
            </div>
          </div>
          <CardContent className="p-5 bg-white dark:bg-slate-900">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-primary/5 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Received</p>
                <p className="font-black text-primary text-lg">₫{totalEarned.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-violet-50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Withdrawn</p>
                <p className="font-black text-violet-600 text-lg">₫{totalWithdrawn.toLocaleString()}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowWithdraw(true)}
              className="w-full bg-primary hover:bg-primary/90 gap-2 shadow-sm"
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw to bank
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Earnings in last 6 months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-32">
              {monthlyData.map((d, i) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    ₫{(d.amount / 1000000).toFixed(1)}M
                  </span>
                  <motion.div
                    className="w-full rounded-t-lg bg-primary"
                    style={{ height: `${(d.amount / maxAmount) * 100}px` }}
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.amount / maxAmount) * 100}px` }}
                    transition={{ delay: 0.5 + i * 0.07, duration: 0.6 }}
                  />
                  <span className="text-[10px] text-slate-400">{d.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {WALLET_TRANSACTIONS.map((tx, idx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:bg-[#0b1120] transition-all"
              >
                {/* Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  tx.type === "earning" ? "bg-primary/5" : "bg-violet-50"
                )}>
                  {tx.type === "earning"
                    ? <ArrowDownLeft className="w-5 h-5 text-primary" />
                    : <ArrowUpRight className="w-5 h-5 text-violet-600" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{tx.description}</p>
                  <p className="text-xs text-slate-400">{tx.date}</p>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    "font-black text-base",
                    tx.type === "earning" ? "text-primary" : "text-violet-600"
                  )}>
                    {tx.type === "earning" ? "+" : "-"}₫{tx.amount.toLocaleString()}
                  </p>
                  <Badge className={cn(
                    "text-[9px] px-1.5 py-0 border-0",
                    tx.status === "completed" ? "bg-primary/5 text-primary" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                  )}>
                    {tx.status === "completed" ? "Completed" : "Processing"}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-primary" /> Withdraw to account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-xs text-primary font-semibold mb-1">Available Balance</p>
              <p className="text-2xl font-black text-primary/90">₫{balance.toLocaleString()}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Withdrawal amount (VND)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₫</span>
                <Input
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="500.000"
                  className="pl-8 border-slate-200 dark:border-slate-800 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bank</Label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{bankName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{bankAccount}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto text-xs text-primary h-7">Change</Button>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 rounded-xl p-3">
              <p className="text-xs text-amber-700 dark:text-amber-500">
                 Tiền will be sent to tài khoản trong <strong>1-2 business days</strong>. Transaction cannot be undone.
              </p>
            </div>

            <Button onClick={handleWithdraw} className="w-full bg-primary hover:bg-primary/90 gap-2">
              <CheckCircle2 className="w-4 h-4" /> Confirm Withdrawal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
