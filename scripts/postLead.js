const url = 'http://localhost:3000/api/leads';
const payload = {
  name: 'Test User A',
  email: 'testA@example.com',
  phone: '+1 (555) 000-0001',
  city: 'Testville',
  description: 'Test lead allocation A',
  serviceType: 'SERVICE_1'
};

(async () => {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (err) {
    console.error(err);
  }
})();
