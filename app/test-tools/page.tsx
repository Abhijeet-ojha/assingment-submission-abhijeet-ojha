"use client";

import { useMemo, useState } from 'react';
import { serviceLabels } from '@/lib/service-labels';
import {
  buildConcurrentLeadPayloads,
  buildDuplicateLeadPayload,
  buildStressTestPayloads,
  buildWebhookQuotaResetPayload,
  buildWebhookReplayPayload
} from '@/lib/test-tools';

type DemoState = {
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  payload: unknown;
};

  const serviceOptions = Object.entries(serviceLabels).map(([value, label]) => ({ value, label }));

export default function TestToolsPage() {
  const [leadForm, setLeadForm] = useState({
    name: 'Burst Lead',
    email: 'burst@example.com',
    phone: '+1 555 0199',
    city: 'Austin',
    description: 'Stress test lead',
    serviceType: 'SERVICE_1',
    count: 10
  });
  const [webhookLead, setWebhookLead] = useState({
    name: 'Webhook Lead',
    email: 'webhook@example.com',
    phone: '+1 555 0108',
    city: 'Dallas',
    description: 'Webhook replay test',
    serviceType: 'SERVICE_2'
  });
  const [state, setState] = useState<DemoState>({ status: 'idle', message: '', payload: null });

  const duplicatePayload = useMemo(() => buildDuplicateLeadPayload({
    name: leadForm.name,
    email: leadForm.email,
    phone: leadForm.phone,
    city: leadForm.city,
    description: leadForm.description,
    serviceType: leadForm.serviceType as 'SERVICE_1' | 'SERVICE_2' | 'SERVICE_3'
  }), [leadForm]);

  async function postJson(url: string, payload: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      status: response.status,
      body: await response.json()
    };
  }

  async function runResetQuotas() {
    setState({ status: 'running', message: 'Sending quota reset webhook...', payload: null });

    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await postJson('/api/test/reset', {
        providerCodes: [1, 4, 5],
        monthKey: new Date().toISOString().slice(0, 7),
        idempotencyKey
      });
      setState({
        status: response.body.success ? 'success' : 'error',
        message: response.body.success ? 'Quota reset accepted.' : response.body.error ?? 'Quota reset failed',
        payload: response
      });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Quota reset failed', payload: null });
    }
  }

  async function runReplayWebhook() {
    setState({ status: 'running', message: 'Replaying the same webhook key...', payload: null });

    try {
      const leadResponse = await postJson('/api/leads', {
        name: webhookLead.name,
        phone: webhookLead.phone,
        city: webhookLead.city,
        description: webhookLead.description,
        serviceType: webhookLead.serviceType as 'SERVICE_1' | 'SERVICE_2' | 'SERVICE_3',
        email: `${webhookLead.email.split('@')[0]}+${Date.now()}@example.com`
      });

      if (!leadResponse.body.success) {
        throw new Error(leadResponse.body.error ?? 'Lead creation failed');
      }

      const idempotencyKey = crypto.randomUUID();
      const payload = buildWebhookReplayPayload(leadResponse.body.data.lead.id, idempotencyKey);
      const first = await postJson('/api/test/webhook', payload);
      const second = await postJson('/api/test/webhook', payload);

      setState({
        status: 'success',
        message: 'Webhook replay completed with idempotent handling.',
        payload: { leadResponse, first, second }
      });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Webhook replay failed', payload: null });
    }
  }

  async function runConcurrentLeads() {
    setState({ status: 'running', message: 'Generating 10 concurrent leads...', payload: null });

    try {
      const leadInput = {
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone,
        city: leadForm.city,
        description: leadForm.description,
        serviceType: leadForm.serviceType as 'SERVICE_1' | 'SERVICE_2' | 'SERVICE_3'
      };
      const response = await postJson('/api/test/concurrency', { count: 10, input: leadInput });
      setState({ status: response.body.success ? 'success' : 'error', message: response.body.success ? 'Concurrent leads submitted.' : response.body.error ?? 'Failed', payload: response.body.data });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Concurrent lead generation failed', payload: null });
    }
  }

  async function runDuplicateLeads() {
    setState({ status: 'running', message: 'Submitting duplicate leads...', payload: null });

    try {
      const first = await postJson('/api/leads', duplicatePayload);
      const second = await postJson('/api/leads', duplicatePayload);
      setState({ status: 'success', message: 'Duplicate lead test completed.', payload: { first, second } });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Duplicate lead test failed', payload: null });
    }
  }

  async function runAllocationStressTest() {
    setState({ status: 'running', message: 'Running allocation stress test...', payload: null });

    try {
      const leadInput = {
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone,
        city: leadForm.city,
        description: leadForm.description,
        serviceType: 'SERVICE_3'
      };
      const response = await postJson('/api/test/concurrency', { count: 10, input: leadInput });
      setState({ status: response.body.success ? 'success' : 'error', message: response.body.success ? 'Allocation stress test completed.' : response.body.error ?? 'Failed', payload: response.body.data });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Allocation stress test failed', payload: null });
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">Test Tools</p>
        <h1 className="text-3xl font-semibold text-white">Backend validation helpers</h1>
        <p className="text-sm leading-6 text-slate-300">Isolated test surface for quota resets, replay-safe webhooks, duplicate leads, and concurrent allocation stress.</p>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft">
          <h2 className="text-lg font-medium text-white">Lead generator</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextInput label="Name" value={leadForm.name} onChange={(name) => setLeadForm((current) => ({ ...current, name }))} />
            <TextInput label="Email" value={leadForm.email} onChange={(email) => setLeadForm((current) => ({ ...current, email }))} />
            <TextInput label="Phone" value={leadForm.phone} onChange={(phone) => setLeadForm((current) => ({ ...current, phone }))} />
            <TextInput label="City" value={leadForm.city} onChange={(city) => setLeadForm((current) => ({ ...current, city }))} />
            <SelectInput label="Service" value={leadForm.serviceType} onChange={(serviceType) => setLeadForm((current) => ({ ...current, serviceType }))} />
            <TextAreaInput className="sm:col-span-2" label="Description" value={leadForm.description} onChange={(description) => setLeadForm((current) => ({ ...current, description }))} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton onClick={runConcurrentLeads}>Generate 10 concurrent leads</ActionButton>
            <ActionButton onClick={runDuplicateLeads}>Generate duplicate leads</ActionButton>
            <ActionButton onClick={runAllocationStressTest}>Trigger allocation stress test</ActionButton>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft">
          <h2 className="text-lg font-medium text-white">Webhook simulation</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextInput label="Name" value={webhookLead.name} onChange={(name) => setWebhookLead((current) => ({ ...current, name }))} />
            <TextInput label="Email" value={webhookLead.email} onChange={(email) => setWebhookLead((current) => ({ ...current, email }))} />
            <TextInput label="Phone" value={webhookLead.phone} onChange={(phone) => setWebhookLead((current) => ({ ...current, phone }))} />
            <TextInput label="City" value={webhookLead.city} onChange={(city) => setWebhookLead((current) => ({ ...current, city }))} />
            <SelectInput label="Service" value={webhookLead.serviceType} onChange={(serviceType) => setWebhookLead((current) => ({ ...current, serviceType }))} />
            <TextAreaInput className="sm:col-span-2" label="Description" value={webhookLead.description} onChange={(description) => setWebhookLead((current) => ({ ...current, description }))} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton onClick={runResetQuotas}>Reset quotas via webhook</ActionButton>
            <ActionButton onClick={runReplayWebhook}>Replay webhook multiple times</ActionButton>
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Result</h2>
        <p className={`mt-3 text-sm ${state.status === 'error' ? 'text-rose-300' : 'text-slate-200'}`}>{state.message || 'No action yet.'}</p>
        {state.payload ? <pre className="mt-4 overflow-x-auto rounded-xl bg-black/30 p-4 text-xs leading-6 text-slate-300">{JSON.stringify(state.payload, null, 2)}</pre> : null}
      </section>
    </main>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="block text-slate-200">{label}</span>
      <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaInput({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`space-y-2 text-sm ${className}`}>
      <span className="block text-slate-200">{label}</span>
      <textarea className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="block text-slate-200">{label}</span>
      <select className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100" value={value} onChange={(event) => onChange(event.target.value)}>
        {serviceOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400">
      {children}
    </button>
  );
}
