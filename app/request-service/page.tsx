"use client";

import { useState } from 'react';
import { serviceLabels } from '@/lib/service-labels';

type ServiceCode = 'SERVICE_1' | 'SERVICE_2' | 'SERVICE_3';
type FormState = {
  name: string;
  email: string;
  phone: string;
  city: string;
  serviceType: ServiceCode;
  description: string;
};

type SubmissionState = {
  status: 'idle' | 'submitting' | 'success' | 'error';
  message: string;
  payload: unknown;
};

export default function RequestServicePage() {
  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    city: '',
    serviceType: 'SERVICE_1',
    description: ''
  });

  const [submission, setSubmission] = useState<SubmissionState>({
    status: 'idle',
    message: '',
    payload: null
  });

  const serviceOptions: Array<{ label: string; value: ServiceCode }> = [
    { label: serviceLabels.SERVICE_1, value: 'SERVICE_1' },
    { label: serviceLabels.SERVICE_2, value: 'SERVICE_2' },
    { label: serviceLabels.SERVICE_3, value: 'SERVICE_3' }
  ];

  const isValid = formState.name && formState.phone && formState.city && formState.description;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValid) {
      setSubmission({
        status: 'error',
        message: 'Please fill in all required fields.',
        payload: null
      });
      return;
    }

    setSubmission({ status: 'submitting', message: 'Submitting...', payload: null });

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email || undefined,
          phone: formState.phone,
          city: formState.city,
          serviceType: formState.serviceType,
          description: formState.description,
          source: 'request-service-page'
        })
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: {
          duplicate: boolean;
          lead: { id: string; phone: string; name: string };
          assignments: Array<{ providerId: number }>;
          monthKey: string;
        };
      };

      if (!response.ok || !result.success) {
        const isDuplicate = result.data?.duplicate;
        setSubmission({
          status: 'error',
          message: isDuplicate
            ? `Duplicate lead detected. Same phone and service type.`
            : result.error || 'Failed to submit lead.',
          payload: result.data || null
        });
        return;
      }

      setSubmission({
        status: 'success',
        message: `Success! Your request has been allocated to ${result.data?.assignments.length || 0} service providers for ${result.data?.monthKey}. We'll be in touch shortly.`,
        payload: result.data
      });

      setFormState({
        name: '',
        email: '',
        phone: '',
        city: '',
        serviceType: 'SERVICE_1',
        description: ''
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setSubmission({
        status: 'error',
        message: `Network error: ${message}`,
        payload: null
      });
    }
  };

  const canSubmit = isValid && submission.status !== 'submitting';

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">Public Lead Form</p>
        <h1 className="text-3xl font-semibold text-white">Request service allocation</h1>
        <p className="text-sm leading-6 text-slate-300">
          Submissions are routed through the transactional allocator. Duplicate requests are deduplicated at the database layer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="block text-slate-200">Name *</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              placeholder="Jane Doe"
              required
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="block text-slate-200">Email (optional)</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
              value={formState.email}
              onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
              placeholder="jane@example.com"
              type="email"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="block text-slate-200">Phone *</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
              value={formState.phone}
              onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+1 555 0100"
              required
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="block text-slate-200">Service *</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none ring-0 focus:border-sky-400/60"
              value={formState.serviceType}
              onChange={(event) => setFormState((current) => ({ ...current, serviceType: event.target.value as ServiceCode }))}
              required
            >
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="block text-slate-200">City *</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
            value={formState.city}
            onChange={(event) => setFormState((current) => ({ ...current, city: event.target.value }))}
            placeholder="San Francisco"
            required
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="block text-slate-200">Description *</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
            placeholder="Describe your service needs..."
            required
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex rounded-xl bg-sky-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submission.status === 'submitting' ? 'Submitting...' : 'Create lead'}
        </button>
      </form>

      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Result</h2>
        <p className={`mt-3 text-sm ${submission.status === 'error' ? 'text-rose-300' : submission.status === 'success' ? 'text-emerald-300' : 'text-slate-200'}`}>
          {submission.message || 'No submission yet.'}
        </p>
        {submission.payload ? (
          <pre className="mt-4 overflow-x-auto rounded-xl bg-black/30 p-4 text-xs leading-6 text-slate-300">
            {JSON.stringify(submission.payload, null, 2)}
          </pre>
        ) : null}
      </section>
    </main>
  );
}
