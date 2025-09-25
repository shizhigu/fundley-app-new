"""
Financial tools for ADK - Simplified structure
"""
import asyncio
from typing import Dict, List, Any, Optional, Union
from shared.fmp_client import fmp_client

# API endpoint mapping with TTM support
API_ENDPOINTS = {
    'historical': {
        'getIncomeStatement': '/income-statement',
        'getBalanceSheet': '/balance-sheet-statement',
        'getCashFlow': '/cash-flow-statement',
        'getFinancialRatios': '/ratios',
        'getKeyMetrics': '/key-metrics'
    },
    'ttm': {
        'getIncomeStatement': '/income-statement-ttm',
        'getBalanceSheet': '/balance-sheet-statement-ttm',
        'getCashFlow': '/cash-flow-statement-ttm',
        'getFinancialRatios': '/ratios-ttm',
        'getKeyMetrics': '/key-metrics-ttm'
    }
}

# Helper function for field extraction
def extract_fields(data: List[Dict], fields: List[str], timeframe: str) -> List[Dict]:
    """Extract fields from data array with metadata auto-extraction"""
    extracted_data = []

    for period in data:
        extracted = {}

        # Auto-extract metadata based on value type and field name rules
        for key, value in period.items():
            # Rule 1: All string values are metadata
            if isinstance(value, str):
                extracted[key] = value
            # Rule 2: Fields containing 'year' are metadata
            elif 'year' in key.lower():
                extracted[key] = value
            # Rule 3: Add requested data fields
            elif key in fields and value is not None:
                extracted[key] = value
            # Rule 4: For TTM endpoints, map TTM-suffixed fields
            elif timeframe == 'ttm' and key.endswith('TTM') and value is not None:
                original_field = key.replace('TTM', '')
                if original_field in fields:
                    extracted[original_field] = value

        extracted_data.append(extracted)

    return extracted_data

async def get_financial_data(
    symbols: List[str],
    fields_by_data_type: Optional[Dict[str, List[str]]] = None,
    fields: Optional[List[str]] = None,
    data_type: Optional[str] = None,
    timeframe: str = 'both',
    period: str = 'annual',
    limit: int = 5
) -> Dict[str, Any]:
    """
    Get comprehensive financial data from Financial Modeling Prep (FMP) API.
    Simplified ADK version.
    """
    try:
        # Input validation and normalization
        data_structure: Dict[str, List[str]]

        # Method 1: Cross-dataset (preferred)
        if fields_by_data_type and len(fields_by_data_type) > 0:
            data_structure = fields_by_data_type
        # Method 2: Legacy single dataset
        elif fields and data_type:
            data_structure = {data_type: fields}
        else:
            return {
                'success': False,
                'error': '🚨 PARAMETER ERROR: Must provide either fieldsByDataType or both fields + dataType parameters',
                'solution': 'SOLUTION: Use fieldsByDataType with exact field names',
                'displayAction': 'Parameter validation failed',
                'displayResult': '❌ Missing required field parameters'
            }

        # Build all API calls based on dataStructure and timeframe
        api_calls = []
        timeframes = ['historical', 'ttm'] if timeframe == 'both' else [timeframe]

        for symbol in symbols:
            for current_data_type, current_fields in data_structure.items():
                for tf in timeframes:
                    endpoint = API_ENDPOINTS[tf].get(current_data_type)
                    if not endpoint:
                        continue

                    # TTM endpoints don't use period parameter
                    params = {'symbol': symbol, 'limit': 1 if tf == 'ttm' else limit}
                    if tf == 'historical':
                        params['period'] = period

                    key = f"{symbol}-{current_data_type}-{tf}"
                    api_calls.append({
                        'symbol': symbol,
                        'dataType': current_data_type,
                        'timeframe': tf,
                        'fields': current_fields,
                        'endpoint': endpoint,
                        'params': params,
                        'key': key
                    })

        # Execute all API calls in parallel
        print(f"Executing {len(api_calls)} parallel API calls for cross-dataset analysis")

        async def make_api_call(call):
            try:
                data = await fmp_client.get(call['endpoint'], call['params'])
                return {**call, 'data': data, 'error': None}
            except Exception as e:
                return {**call, 'data': None, 'error': str(e)}

        results = await asyncio.gather(*[make_api_call(call) for call in api_calls], return_exceptions=True)

        # Process results
        successful = []
        failed = []

        for result in results:
            if isinstance(result, Exception):
                failed.append({'error': str(result), 'key': 'unknown'})
                continue

            if result['data'] and isinstance(result['data'], list) and len(result['data']) > 0:
                successful.append({
                    'symbol': result['symbol'],
                    'dataType': result['dataType'],
                    'timeframe': result['timeframe'],
                    'fields': result['fields'],
                    'data': result['data'],
                    'key': result['key']
                })
            else:
                failed.append({
                    'symbol': result['symbol'],
                    'dataType': result['dataType'],
                    'timeframe': result['timeframe'],
                    'error': result['error'] or 'No data returned',
                    'key': result['key']
                })

        if len(successful) == 0:
            return {
                'success': False,
                'error': 'No data retrieved from any API calls',
                'failedCalls': failed,
                'displayAction': 'Cross-dataset fetch',
                'displayResult': f"Failed all {len(api_calls)} API calls"
            }

        # Structure the response data by symbol
        structured_data = {}
        formatted_data_lines = []

        formatted_data_lines.append(f"Finding financial data for {', '.join(symbols)}...\\n")

        for symbol in symbols:
            symbol_results = [r for r in successful if r['symbol'] == symbol]
            if len(symbol_results) == 0:
                continue

            structured_data[symbol] = {}
            formatted_data_lines.append(f"=== {symbol.upper()} ===")

            # Group by timeframe first
            historical_results = [r for r in symbol_results if r['timeframe'] == 'historical']
            ttm_results = [r for r in symbol_results if r['timeframe'] == 'ttm']

            if historical_results:
                structured_data[symbol]['historical'] = {}
                formatted_data_lines.append(f"Historical Data ({period}, {limit} periods):")

                for result in historical_results:
                    extracted_data = extract_fields(result['data'], result['fields'], 'historical')
                    structured_data[symbol]['historical'][result['dataType']] = extracted_data

                    formatted_data_lines.append(f"  {result['dataType'].replace('get', '')}:")
                    if extracted_data:
                        latest = extracted_data[0]
                        formatted_data_lines.append(f"    Period: {latest.get('period', 'N/A')} | FiscalYear: {latest.get('fiscalYear', 'N/A')} | Date: {latest.get('date', 'N/A')}")

                        for field in result['fields']:
                            if latest.get(field) is not None:
                                formatted_data_lines.append(f"      {field}: {latest[field]}")

                formatted_data_lines.append("")

            if ttm_results:
                structured_data[symbol]['ttm'] = {}
                formatted_data_lines.append("TTM Data (trailing 12 months):")

                for result in ttm_results:
                    extracted_data = extract_fields(result['data'], result['fields'], 'ttm')
                    structured_data[symbol]['ttm'][result['dataType']] = extracted_data

                    formatted_data_lines.append(f"  {result['dataType'].replace('get', '')}:")
                    if extracted_data:
                        latest = extracted_data[0]
                        formatted_data_lines.append(f"    Date: {latest.get('date', 'N/A')} | FiscalYear: {latest.get('fiscalYear', 'N/A')}")

                        for field in result['fields']:
                            if latest.get(field) is not None:
                                formatted_data_lines.append(f"      {field}: {latest[field]}")

                formatted_data_lines.append("")

        # Return structured response
        response = {
            'success': True,
            'symbols': symbols,
            'timeframe': timeframe,
            'dataTypes': list(data_structure.keys()),
            'totalApiCalls': len(api_calls),
            'successfulCalls': len(successful),
            'data': structured_data,
            'formattedData': '\\n'.join(formatted_data_lines),
            'displayAction': f'Cross-dataset {timeframe} analysis',
            'displayResult': f'Retrieved data from {len(successful)}/{len(api_calls)} API calls{f" ({len(failed)} failed)" if failed else ""}'
        }

        if failed:
            response['warnings'] = [f"{f['key']}: {f['error']}" for f in failed]

        return response

    except Exception as e:
        return {
            'success': False,
            'error': f'Tool execution failed: {str(e)}',
            'displayAction': 'Financial data fetch',
            'displayResult': '❌ Unexpected error occurred'
        }

# Other simple tools
async def get_company_profile(symbol: str) -> Dict[str, Any]:
    """Get company profile information"""
    try:
        data = await fmp_client.get('/profile', {'symbol': symbol})
        return {'success': True, 'data': data}
    except Exception as e:
        return {'success': False, 'error': str(e)}

async def get_stock_quote(symbol: str) -> Dict[str, Any]:
    """Get real-time stock quote"""
    try:
        data = await fmp_client.get('/quote', {'symbol': symbol})
        return {'success': True, 'data': data}
    except Exception as e:
        return {'success': False, 'error': str(e)}