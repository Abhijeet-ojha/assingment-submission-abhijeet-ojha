const base = 'http://localhost:3000';

async function postLead(payload) {
  const res = await fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

(async () => {
  const payloads = Array.from({ length: 10 }).map((_, i) => ({
    name: `Concurrent ${i}`,
    email: `concurrent${i}@example.com`,
    phone: `+1 555 1000${i.toString().padStart(2,'0')}`,
    city: 'CT',
    description: 'Concurrent test',
    serviceType: 'SERVICE_1'
  }));

  console.log('Posting 10 leads concurrently...');
  const results = await Promise.all(payloads.map(p => postLead(p)));
  console.log(results.map(r => ({ status: r.status })));

  const dash = await fetch(base + '/api/dashboard').then(r => r.json());
  console.log('Dashboard summary providers count sample:');
  console.log(dash.data.providers.map(p => ({ providerCode: p.providerCode, monthUsage: p.monthUsage, remainingQuota: p.remainingQuota })));

  process.exit(0);
})();
