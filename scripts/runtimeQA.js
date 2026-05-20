const base = 'http://localhost:3000';

async function postLead(payload) {
  const res = await fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function getJSON(path) {
  const res = await fetch(base + path);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

(async () => {
  console.log('1) GET /api/leads (before)');
  console.log(await getJSON('/api/leads'));

  console.log('\n2) POST lead A (SERVICE_1)');
  const leadA = {
    name: 'QA User A',
    email: 'qaA@example.com',
    phone: '+1 (555) 000-0101',
    city: 'CityA',
    description: 'QA lead A',
    serviceType: 'SERVICE_1'
  };
  console.log(await postLead(leadA));

  console.log('\n3) POST duplicate (same phone+service)');
  console.log(await postLead(leadA));

  console.log('\n4) POST same phone different service (SERVICE_2)');
  const leadB = { ...leadA, serviceType: 'SERVICE_2' };
  console.log(await postLead(leadB));

  console.log('\n5) POST lead C (SERVICE_1) to check rotation');
  const leadC = { ...leadA, phone: '+1 (555) 000-0102', name: 'QA User C' };
  console.log(await postLead(leadC));

  console.log('\n6) GET /api/dashboard');
  console.log(await getJSON('/api/dashboard'));

  process.exit(0);
})();
