const PostgreAdapter = require('../lib/adapter');

const connectionURI = 'postgresql://postgres: @localhost:5432/temp';

test('adapter should properly connected to database', async () => {
  try {
    const client = new PostgreAdapter(connectionURI);
    await client.open();
    await client.close();
  } catch (err) {
    throw new Error(err.message);
  }
});
