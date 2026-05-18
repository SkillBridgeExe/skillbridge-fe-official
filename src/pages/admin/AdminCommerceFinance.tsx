import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function AdminCommerceFinance() {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-poppins">Commerce & Finance</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage transactions, mentor payouts, and promotional campaigns.</div>
        </div>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="w-full md:w-auto justify-start bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="space-y-4">
          <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Revenue & Transactions</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Track deposits, course purchases, and mentor bookings.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-700 dark:text-slate-300">
                Transaction history and reconciliation table will be displayed here.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Mentor Payout Requests</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Review and approve withdrawal requests from mentors.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-700 dark:text-slate-300">
                Pending payout requests grouped by mentor will appear here.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Campaigns & Vouchers</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Create discount codes for seasonal events (e.g., Back to School).
                  </p>
                </div>
                <Button className="rounded-xl">Create Voucher</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-4 rounded-xl">
                  <h4 className="font-bold text-green-900 dark:text-green-300 uppercase">BACK2SCHOOL</h4>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1">20% off mentor bookings</div>
                  <div className="text-xs text-green-600/70 dark:text-green-300/70 mt-2">Active until Sep 30</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}