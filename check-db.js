const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL);

(async () => {
  try {
    // Check organizations table structure
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      ORDER BY ordinal_position;
    `;
    console.log('Organizations table structure:');
    console.log(JSON.stringify(result, null, 2));

    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'organizations'
      );
    `;
    console.log('\nTable exists:', tableExists[0].exists);

    // Count rows
    const count = await sql`SELECT COUNT(*) FROM organizations;`;
    console.log('Row count:', count[0].count);

    // Show all organizations
    const orgs = await sql`SELECT * FROM organizations;`;
    console.log('\nAll organizations:');
    console.log(JSON.stringify(orgs, null, 2));

    await sql.end();
  } catch (error) {
    console.error('Error:', error.message);
    await sql.end();
    process.exit(1);
  }
})();
