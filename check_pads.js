const { connectDB } = require('./data/db');
const { Padeiro } = require('./data/models');

async function check() {
  await connectDB();
  const pads = await Padeiro.find().limit(5);
  console.log(JSON.stringify(pads, null, 2));
  process.exit(0);
}
check();
