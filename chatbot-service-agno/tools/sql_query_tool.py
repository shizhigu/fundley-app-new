"""
MotherDuck SQL Query Tool for ADK - 复刻自Vercel AI SDK版本
直接查询MotherDuck数据库
"""
import os
import aiohttp
from datetime import datetime
from typing import Dict, Any, Optional, List


async def sql_query(sql: str, limit: Optional[int] = None, description: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute SQL query against MotherDuck database

    Args:
        sql: SQL query to execute
        limit: Optional limit for results (default: no limit)
        description: Optional description of what the query does

    Returns:
        Dict with data, success status, row_count, and metadata
    """
    # Check for MotherDuck API URL
    motherduck_url = os.getenv('MOTHERDUCK_API_URL', 'http://localhost:8000')

    try:
        # Add LIMIT clause if specified and not already present
        processed_sql = sql.strip()
        if limit is not None and 'LIMIT' not in processed_sql.upper():
            processed_sql += f' LIMIT {limit}'

        print(f"🦆 SQL Query: {processed_sql}")
        if description:
            print(f"📝 Description: {description}")

        # Make request to MotherDuck API
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{motherduck_url}/query",
                headers={'Content-Type': 'application/json'},
                json={'sql': processed_sql}
            ) as response:

                if not response.ok:
                    error_text = await response.text()
                    raise Exception(f"MotherDuck API error: {response.status} {response.reason} - {error_text}")

                result = await response.json()

        # Check if query was successful
        if not result.get('success', False):
            return {
                "success": False,
                "error": result.get('error', 'Query execution failed'),
                "sql": processed_sql,
                "timestamp": datetime.now().isoformat()
            }

        print(f"✅ Query completed: {result.get('row_count', 0)} rows returned")

        # Return structured response
        return {
            "success": True,
            "data": result.get('data', []),
            "row_count": result.get('row_count', 0),
            "sql": processed_sql,
            "description": description,
            "timestamp": datetime.now().isoformat(),
            "database": "MotherDuck"
        }

    except Exception as error:
        error_msg = f"SQL query failed: {str(error)}"
        print(f"❌ SQL Query error: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "sql": processed_sql if 'processed_sql' in locals() else sql,
            "timestamp": datetime.now().isoformat()
        }