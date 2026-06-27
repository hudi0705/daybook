import * as jose from 'jose';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const JWT_SECRET=*** TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');

async function main() {
  const token = await new jose.SignJWT({ email: 'test@example.com', username: 'test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('1')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);

  const args = process.argv.slice(2);
  const action = args[0] || 'token';

  if (action === 'token') {
    process.stdout.write(token);
  } else if (action === 'test-crud') {
    const BASE = 'http://localhost:5000/api/daily-reports';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    console.log('=== CREATE daily report ===');
    const createRes = await fetch(BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: '2026-06-26',
        title: 'Test Report',
        content: 'This is a test daily report content',
        mood: 'happy',
        tags: ['test', 'database'],
      }),
    });
    const createData = await createRes.json();
    console.log(JSON.stringify(createData, null, 2));

    const reportId = createData.data?.id;

    console.log('\n=== LIST daily reports ===');
    const listRes = await fetch(BASE, { headers });
    const listData = await listRes.json();
    console.log(JSON.stringify(listData, null, 2));

    if (reportId) {
      console.log(`\n=== GET daily report #${reportId} ===`);
      const getRes = await fetch(`${BASE}/${reportId}`, { headers });
      const getData = await getRes.json();
      console.log(JSON.stringify(getData, null, 2));

      console.log(`\n=== UPDATE daily report #${reportId} ===`);
      const updateRes = await fetch(`${BASE}/${reportId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: 'Updated Test Report',
          content: 'Updated content for the test report',
          mood: 'excited',
          tags: ['test', 'database', 'updated'],
        }),
      });
      const updateData = await updateRes.json();
      console.log(JSON.stringify(updateData, null, 2));
    }

    console.log('\n=== STATS SUMMARY ===');
    const statsRes = await fetch(`${BASE}/stats/summary`, { headers });
    const statsData = await statsRes.json();
    console.log(JSON.stringify(statsData, null, 2));

    console.log('\n=== CONTRIBUTION HEATMAP ===');
    const contribRes = await fetch('http://localhost:5000/api/contribution', { headers });
    const contribData = await contribRes.json();
    console.log(JSON.stringify(contribData, null, 2));

    if (reportId) {
      console.log(`\n=== DELETE daily report #${reportId} ===`);
      const deleteRes = await fetch(`${BASE}/${reportId}`, {
        method: 'DELETE',
        headers,
      });
      const deleteData = await deleteRes.json();
      console.log(JSON.stringify(deleteData, null, 2));
    }

    console.log('\n=== VERIFY DELETION (LIST) ===');
    const list2Res = await fetch(BASE, { headers });
    const list2Data = await list2Res.json();
    console.log(JSON.stringify(list2Data, null, 2));
  }
}

main().catch(console.error);
