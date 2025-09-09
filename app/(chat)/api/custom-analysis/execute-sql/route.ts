import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Pool } from 'pg';

const requestSchema = z.object({
  sql: z.string().describe('The SQL query to execute'),
  safetyOverride: z.boolean().default(false).describe('Override basic safety checks (admin only)')
});

// Database connection pool
function getPool(): Pool {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection could not be established
    });
  }
  
  throw new Error('Database connection string not configured');
}

// SQL Safety Validator
class SQLSafetyValidator {
  private static DANGEROUS_KEYWORDS = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'CREATE', 'ALTER', 'TRUNCATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL'
  ];
  
  private static REQUIRED_SAFETY_PATTERNS = [
    /LIMIT\s+\d+/i,  // Must have LIMIT clause
  ];
  
  private static MAX_LIMIT = 10000; // Maximum allowed LIMIT
  
  static validateQuery(sql: string, safetyOverride: boolean = false): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!safetyOverride) {
      // Check for dangerous keywords
      const upperSQL = sql.toUpperCase();
      for (const keyword of this.DANGEROUS_KEYWORDS) {
        if (upperSQL.includes(keyword)) {
          errors.push(`Dangerous SQL keyword detected: ${keyword}`);
        }
      }
      
      // Check for required safety patterns
      if (!this.REQUIRED_SAFETY_PATTERNS.some(pattern => pattern.test(sql))) {
        errors.push('Query must include a LIMIT clause for safety');
      }
      
      // Check LIMIT value
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limitValue = parseInt(limitMatch[1]);
        if (limitValue > this.MAX_LIMIT) {
          errors.push(`LIMIT value ${limitValue} exceeds maximum allowed ${this.MAX_LIMIT}`);
        }
      }
      
      // Check for potentially expensive operations
      if (/SELECT\s+\*\s+FROM/i.test(sql)) {
        warnings.push('SELECT * queries may be expensive on large tables');
      }
      
      if (!sql.includes('WHERE')) {
        warnings.push('Query without WHERE clause may scan entire table');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    const body = await request.json();
    const { sql, safetyOverride } = requestSchema.parse(body);
    
    // Validate SQL safety
    const validation = SQLSafetyValidator.validateQuery(sql, safetyOverride);
    if (!validation.isValid) {
      return Response.json({
        success: false,
        error: 'SQL safety validation failed',
        details: {
          errors: validation.errors,
          warnings: validation.warnings
        }
      }, { status: 400 });
    }
    
    // Initialize database connection
    pool = getPool();
    
    // Add query timeout and execute
    const startTime = Date.now();
    const timeoutMs = 30000; // 30 second timeout
    
    const client = await pool.connect();
    
    try {
      // Set statement timeout for this connection
      await client.query('SET statement_timeout = $1', [timeoutMs]);
      
      const result = await client.query(sql);
      const executionTime = Date.now() - startTime;
      
      // Format results for frontend
      const formattedResults = result.rows.map((row, index) => ({
        ...row,
        _rowIndex: index + 1  // Add row index for display
      }));
      
      return Response.json({
        success: true,
        data: {
          results: formattedResults,
          totalRows: result.rowCount,
          executionTimeMs: executionTime,
          columns: result.fields.map(field => ({
            name: field.name,
            type: field.dataTypeID,
            tableName: field.tableID ? 'table_' + field.tableID : undefined
          }))
        },
        warnings: validation.warnings
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('SQL execution failed:', error);
    
    let errorMessage = 'Unknown database error occurred';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Parse PostgreSQL errors for better user experience
      if (error.message.includes('syntax error')) {
        errorMessage = 'SQL syntax error. Please check your query.';
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        errorMessage = 'Referenced table or column does not exist.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Query execution timeout (30s limit exceeded).';
      } else if (error.message.includes('connection')) {
        errorMessage = 'Database connection error. Please try again.';
      }
      
      errorDetails = {
        originalError: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
    
    return Response.json({
      success: false,
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
    
  } finally {
    // Clean up database connection pool
    if (pool) {
      await pool.end();
    }
  }
}