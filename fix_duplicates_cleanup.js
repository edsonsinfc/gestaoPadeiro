require('dotenv').config();
const { connectDB } = require('./data/db');
const { Atividade } = require('./data/models');

async function cleanup() {
  await connectDB();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  console.log('Today:', today);

  // Remove old em_andamento (not from today)
  const old = await Atividade.deleteMany({ status: 'em_andamento', data: { $ne: today } });
  console.log('Old stale removed:', old.deletedCount);

  // Show remaining today duplicates
  const todayActs = await Atividade.find({ status: 'em_andamento', data: today });
  console.log('Today em_andamento:', todayActs.length);

  // Keep only 1 per client, remove rest
  const seen = new Map();
  const toDelete = [];
  for (const a of todayActs) {
    const key = `${a.padeiroId}_${a.clienteId}`;
    if (seen.has(key)) {
      toDelete.push(a._id);
    } else {
      seen.set(key, a._id);
    }
  }
  if (toDelete.length > 0) {
    await Atividade.deleteMany({ _id: { $in: toDelete } });
    console.log('Today duplicates removed:', toDelete.length);
  }

  const remaining = await Atividade.find({ status: 'em_andamento' });
  console.log('Final em_andamento count:', remaining.length);
  for (const a of remaining) console.log('  -', a.clienteNome, a.data);

  process.exit(0);
}
cleanup().catch(e => { console.error(e); process.exit(1); });
