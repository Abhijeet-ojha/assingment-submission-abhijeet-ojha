"use client";

import { useEffect, useState } from 'react';
import { useDashboardEvents } from '@/lib/useDashboardEvents';
import { serviceLabels } from '@/lib/service-labels';

type DashboardResponse = {
  monthKey: string;
  summary: {
    totalLeads: number;
    currentMonthAssignments: number;
    webhookEvents: number;
    providersOnline: number;
  };
  providers: Array<{
    id: number;
    providerCode: number;
    name: string;
    monthlyQuota: number;
    active: boolean;
    monthUsage: number;
    remainingQuota: number;
    totalAssignments: number;
  }>;
  assignedLeads: Array<{
    id: string;
    service: {
      code: keyof typeof serviceLabels;
      name: string;
    };
    name: string;
    phone: string;
    status: string;
    createdAt: string;
    assignments: Array<{
      providerCode: number;
      providerName: string;
      service: {
        code: keyof typeof serviceLabels;
      };
      assignedAt: string;
    }>;
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { connected, reconnectAttempts, lastEvent } = useDashboardEvents();

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error(`Failed to load dashboard: ${response.statusText}`);
      }
      const dashboard = (await response.json()) as { success: boolean; data: DashboardResponse };
      setData(dashboard.data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error loading dashboard';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (lastEvent?.type === 'dashboard.refresh') {
      loadDashboard();
    }
  }, [lastEvent]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">Provider Dashboard</p>
        <h1 className="text-3xl font-semibold text-white">Real-time allocation status</h1>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="text-sm text-slate-400">
            {connected ? 'Connected to events' : `Reconnecting (attempt ${reconnectAttempts})`}
          </span>
        </div>
      </div>

      {isLoading && <p className="mt-6 text-slate-400">Loading dashboard...</p>}
      {error && <p className="mt-6 text-rose-300">Error: {error}</p>}

      {data && (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Leads</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.summary.totalLeads}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">This Month</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.summary.currentMonthAssignments}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Webhooks</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.summary.webhookEvents}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Providers Online</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.summary.providersOnline}</p>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
            <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Provider Quotas ({data.monthKey})</h2>
            <div className="mt-4 space-y-3">
              {data.providers.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-slate-900/40 p-4">
                  <div>
                    <p className="font-medium text-white">{provider.name}</p>
                    <p className="text-xs text-slate-500">Code: {provider.providerCode}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-300">
                        {provider.monthUsage} / {provider.monthlyQuota}
                      </p>
                      <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-sky-500"
                          style={{
                            width: `${Math.min((provider.monthUsage / provider.monthlyQuota) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        provider.remainingQuota > 0 ? 'bg-emerald-900/40 text-emerald-300' : 'bg-rose-900/40 text-rose-300'
                      }`}
                    >
                      {provider.remainingQuota} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {data.assignedLeads.length > 0 && (
            <section className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
              <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Recent Leads</h2>
              <div className="mt-4 space-y-2 text-sm">
                {data.assignedLeads.slice(0, 10).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/40 p-3 text-xs">
                    <div>
                      <p className="font-medium text-white">{lead.name}</p>
                      <p className="text-slate-500">{lead.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-300">{lead.service.name}</p>
                      <p className="text-slate-500">{lead.assignments.length} providers assigned</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
