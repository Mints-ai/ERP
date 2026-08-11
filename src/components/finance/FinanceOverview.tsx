import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, AlertCircle, ArrowUpRight, DollarSign, Banknote, Sparkles } from "lucide-react";
import { CHART_COLORS, CHART_STYLE } from "@/lib/chartTheme";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface FinanceOverviewProps {
  invoices: any[];
  expenses: any[];
  compCurrency: string;
}

export function FinanceOverview({ invoices, expenses, compCurrency }: FinanceOverviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getDynamicFinancialData = () => {
    if (invoices.length === 0 && expenses.length === 0) return [];

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    const buckets: { name: string; revenue: number; profit: number; monthIdx: number; year: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      buckets.push({
        name: months[d.getMonth()],
        revenue: 0,
        profit: 0,
        monthIdx: d.getMonth(),
        year: d.getFullYear()
      });
    }

    invoices.forEach(inv => {
      let d: Date | null = null;
      if (inv.createdAt) {
        d = inv.createdAt.seconds ? new Date(inv.createdAt.seconds * 1000) : new Date(inv.createdAt);
      } else if (inv.dueDate) {
        d = new Date(inv.dueDate);
      }
      if (!d || isNaN(d.getTime())) return;

      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const match = buckets.find(b => b.monthIdx === mIdx && b.year === yr);
      if (match) {
        const val = Number(inv.total) || 0;
        match.revenue += val;
        match.profit += val;
      }
    });

    expenses.forEach(exp => {
      let d: Date | null = null;
      if (exp.createdAt) {
        d = exp.createdAt.seconds ? new Date(exp.createdAt.seconds * 1000) : new Date(exp.createdAt);
      } else if (exp.date) {
        d = new Date(exp.date);
      }
      if (!d || isNaN(d.getTime())) return;

      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const match = buckets.find(b => b.monthIdx === mIdx && b.year === yr);
      if (match) {
        const val = Number(exp.amount) || 0;
        match.profit -= val;
      }
    });

    return buckets.map(b => ({
      name: b.name,
      revenue: b.revenue,
      profit: Math.max(0, b.profit)
    }));
  };

  const getDynamicExpenseData = () => {
    if (expenses.length === 0) return [];
    const categoryMap: Record<string, number> = {};
    expenses.forEach(exp => {
      const cat = exp.category || "Other";
      const val = Number(exp.amount) || 0;
      categoryMap[cat] = (categoryMap[cat] || 0) + val;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  const totalExpSum = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  const dynamicFinancialData = getDynamicFinancialData();
  const dynamicExpenseData = getDynamicExpenseData();

  const dynamicGrossRevenue = invoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0);
  const dynamicNetProfit = Math.max(0, dynamicGrossRevenue - totalExpSum);
  const dynamicAR = invoices
    .filter(inv => inv.status === "pending" || inv.status === "sent")
    .reduce((acc, inv) => acc + (Number(inv.total) || 0), 0);
  const outstandingCount = invoices.filter(inv => inv.status === "pending" || inv.status === "sent").length;
  const dynamicRunRate = dynamicGrossRevenue * 2;

  const formatCompact = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Gross Revenue</p>
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20"><DollarSign className="w-4 h-4" /></div>
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight font-mono">{formatCompact(dynamicGrossRevenue)} <span className="text-xs text-foreground/30 uppercase tracking-wider font-sans font-bold ml-1">{compCurrency}</span></h3>
            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-accent">
              <ArrowUpRight className="w-3.5 h-3.5" /> Billed Receivables
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Net Profit</p>
              <div className="p-1.5 bg-emerald-500/10 text-accent rounded-lg border border-emerald-500/20"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight font-mono">{formatCompact(dynamicNetProfit)} <span className="text-xs text-foreground/30 uppercase tracking-wider font-sans font-bold ml-1">{compCurrency}</span></h3>
            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-accent">
              <ArrowUpRight className="w-3.5 h-3.5" /> Net surplus
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">AR (Outstanding)</p>
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20"><Banknote className="w-4 h-4" /></div>
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight font-mono">{formatCompact(dynamicAR)} <span className="text-xs text-foreground/30 uppercase tracking-wider font-sans font-bold ml-1">{compCurrency}</span></h3>
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-bold", outstandingCount > 0 ? "text-amber-400" : "text-accent")}>
              <AlertCircle className="w-3.5 h-3.5" /> {outstandingCount} Unpaid
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Run Rate</p>
              <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20"><ArrowUpRight className="w-4 h-4" /></div>
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight font-mono">{formatCompact(dynamicRunRate)} <span className="text-xs text-foreground/30 uppercase tracking-wider font-sans font-bold ml-1">{compCurrency}</span></h3>
            <div className="text-xs font-semibold text-foreground/30 mt-2">Projected annual revenue</div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border p-5">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-sm font-bold text-foreground">Cash Flow (H1 2026)</CardTitle>
            <CardDescription className="text-xs text-foreground/40 mt-1">Revenue vs Expenses vs Net Profit over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[300px] w-full min-w-0">
              {mounted ? (
                dynamicFinancialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dynamicFinancialData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray={CHART_STYLE.grid.strokeDasharray} vertical={false} stroke={CHART_STYLE.grid.stroke} />
                      <XAxis dataKey="name" axisLine={CHART_STYLE.axis.axisLine} tickLine={CHART_STYLE.axis.tickLine} tick={CHART_STYLE.axis.tick} dy={10} />
                      <YAxis axisLine={CHART_STYLE.axis.axisLine} tickLine={CHART_STYLE.axis.tickLine} tick={CHART_STYLE.axis.tick} tickFormatter={(value) => `${value / 1000}k`} />
                      <RechartsTooltip 
                        contentStyle={CHART_STYLE.tooltip.contentStyle}
                        labelStyle={CHART_STYLE.tooltip.labelStyle}
                        cursor={CHART_STYLE.tooltip.cursor}
                        formatter={(value) => [`${Number(value).toLocaleString()} ${compCurrency}`, '']}
                      />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue" />
                      <Area type="monotone" dataKey="profit" stackId="2" stroke="#06b6d4" strokeWidth={2.5} fill="url(#colorProfit)" name="Profit" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-xs text-foreground/30 gap-2 border border-border rounded-2xl p-6">
                    <TrendingUp className="h-8 w-8 text-foreground/20 animate-pulse" />
                    <span className="font-bold uppercase tracking-wider text-xs">No Transaction Data Found</span>
                    <span className="text-xs text-foreground/20 text-center px-6">Generate client invoices or log business expenses to compile live cash flow graphs.</span>
                  </div>
                )
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-foreground/20">Loading chart...</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden border-border p-5 flex flex-col">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-sm font-bold text-foreground">Expense Distribution</CardTitle>
            <CardDescription className="text-xs text-foreground/40 mt-1">Breakdown by category (Current Month)</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col justify-between min-w-0">
            <div className="h-[180px] w-full flex flex-col justify-center relative my-2 min-w-0">
              {mounted ? (
                dynamicExpenseData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={dynamicExpenseData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {dynamicExpenseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={CHART_STYLE.tooltip.contentStyle}
                          formatter={(value) => [`${value} ${compCurrency}`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                      <span className="text-lg font-black text-foreground font-mono leading-none">{totalExpSum.toLocaleString()}</span>
                      <span className="text-xs uppercase font-bold text-foreground/30 tracking-widest mt-1">Total Exp</span>
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-xs text-foreground/30 gap-1.5 border border-border rounded-2xl py-6 p-4">
                    <Sparkles className="h-6 w-6 text-foreground/20 animate-pulse" />
                    <span className="font-bold uppercase tracking-wider text-xs">No Expenses Logged</span>
                    <span className="text-xs text-foreground/20 text-center px-4">AI Scan or Manual entries generate category breakdown.</span>
                  </div>
                )
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-foreground/20">Loading chart...</div>
              )}
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {dynamicExpenseData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center text-foreground/60">
                    <div className="w-2.5 h-2.5 rounded-sm mr-2" style={{backgroundColor: CHART_COLORS[index % CHART_COLORS.length]}}></div>
                    {entry.name}
                  </div>
                  <span className="text-foreground font-mono text-xs">{Number(entry.value).toLocaleString()} {compCurrency}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
