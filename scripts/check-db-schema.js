const { neon } = require('@neondatabase/serverless');

async function checkSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    // Check if invocation_id column exists
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `;

    console.log('Messages table columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check if invocation_id column exists specifically
    const hasInvocationId = columns.find(col => col.column_name === 'invocation_id');
    console.log('\nInvocation ID column exists:', !!hasInvocationId);

    if (hasInvocationId) {
      // Check recent messages with invocation_id
      const recentMessages = await sql`
        SELECT id, role, invocation_id, created_at
        FROM messages
        ORDER BY created_at DESC
        LIMIT 5
      `;

      console.log('\nRecent messages:');
      recentMessages.forEach(msg => {
        console.log(`- ${msg.id}: ${msg.role}, invocation_id: ${msg.invocation_id || 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();