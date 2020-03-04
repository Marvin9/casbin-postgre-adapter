const PostgreAdapter = require('../lib/adapter');

const connectionConfig = {
  user: 'postgres',
  password: ' ',
  database: 'temp',
};

test('adapter should properly connected to database', async () => {
  try {
    const client = new PostgreAdapter(connectionConfig);
    await client.open();
    await client.close();
  } catch (err) {
    throw new Error(err.message);
  }
});
