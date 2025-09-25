"""
SEC Filings Tool for ADK - 复刻自Vercel AI SDK版本
使用SEC-API.io提取SEC文件关键部分
"""
import os
import aiohttp
import re
from datetime import datetime
from typing import Dict, Any, Optional, List


# SEC-API.io配置
SEC_API_KEY = os.getenv('SEC_API_KEY')
SEC_API_BASE_URL = 'https://api.sec-api.io'

if not SEC_API_KEY:
    print("⚠️ SEC_API_KEY not found in environment variables. SEC filing tools will not work.")


async def make_sec_api_request(endpoint: str, params: Dict[str, Any]) -> Any:
    """
    向SEC-API.io发送请求的辅助函数
    """
    if not SEC_API_KEY:
        raise Exception('SEC API key not configured')

    url = f"{SEC_API_BASE_URL}{endpoint}"

    async with aiohttp.ClientSession() as session:
        # Query API - POST with JSON body
        if endpoint == '' or endpoint == '/query':
            async with session.post(
                url,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': SEC_API_KEY
                },
                json=params
            ) as response:
                if not response.ok:
                    raise Exception(f"SEC API error: {response.status} {response.reason}")
                return await response.json()

        # Extractor API - GET with query params
        elif endpoint == '/extractor':
            params_with_token = {**params, 'token': SEC_API_KEY}
            async with session.get(
                url,
                params=params_with_token,
                headers={'Accept-Encoding': 'gzip, deflate, br'}
            ) as response:
                if not response.ok:
                    raise Exception(f"SEC API error: {response.status} {response.reason}")
                return await response.text()

        # Other endpoints - GET with query params
        else:
            params_with_token = {**params, 'token': SEC_API_KEY}
            async with session.get(url, params=params_with_token) as response:
                if not response.ok:
                    raise Exception(f"SEC API error: {response.status} {response.reason}")
                return await response.json()


async def extract_mda(symbol: str, form_type: str = '10-K', filing_year: Optional[int] = None) -> Dict[str, Any]:
    """
    提取管理层讨论与分析(MD&A)部分
    从10-K第7节(年度)或10-Q第1部分第2项(季度)提取

    Args:
        symbol: 股票代码如AAPL, TSLA, MSFT等
        form_type: 文件类型'10-K'(年度)或'10-Q'(季度)
        filing_year: 可选的具体年份

    Returns:
        包含MD&A数据和元数据的字典
    """
    print(f"🔍 Extracting MD&A for {symbol}, form: {form_type}, year: {filing_year}")

    if not symbol:
        return {
            'error': 'Symbol parameter is required but was not provided',
            'success': False
        }

    try:
        # 第1步：查找最近的文件
        query_string = f'ticker:{symbol.upper()} AND formType:"{form_type}"'
        if filing_year:
            query_string += f' AND filedAt:{{{filing_year}-01-01 TO {filing_year}-12-31}}'

        search_query = {
            'query': query_string,
            'from': '0',
            'size': '1',
            'sort': [{'filedAt': {'order': 'desc'}}]
        }

        search_results = await make_sec_api_request('', search_query)

        if not search_results.get('filings') or len(search_results['filings']) == 0:
            year_text = f" in {filing_year}" if filing_year else ""
            return {
                'error': f'No {form_type} filings found for {symbol}{year_text}',
                'success': False
            }

        filing = search_results['filings'][0]

        # 第2步：提取MD&A部分
        section_key = '7' if form_type == '10-K' else 'part1item2'
        extractor_params = {
            'url': filing['linkToFilingDetails'],
            'item': section_key
        }

        extracted_data = await make_sec_api_request('/extractor', extractor_params)

        # 第3步：为LLM消费构建数据结构
        return {
            'success': True,
            'company': {
                'symbol': symbol.upper(),
                'name': filing['companyName'],
                'cik': filing['cik']
            },
            'filing': {
                'type': form_type,
                'date': filing['filedAt'],
                'period': filing['periodOfReport'],
                'accessionNumber': filing['accessionNo'],
                'url': filing['linkToFilingDetails']
            },
            'mdaContent': {
                'title': 'Management\'s Discussion and Analysis of Financial Condition and Results of Operations' if form_type == '10-K' else 'Management\'s Discussion and Analysis',
                'content': extracted_data or '',
                'wordCount': len((extracted_data or '').split()),
                'keyTopics': extract_key_topics(extracted_data or ''),
                'summary': generate_mda_summary(extracted_data or '')
            },
            'metadata': {
                'extractedAt': datetime.now().isoformat(),
                'dataSource': 'SEC-API.io'
            }
        }

    except Exception as error:
        return {
            'error': f'Failed to extract MD&A: {str(error)}',
            'success': False
        }


async def extract_risk_factors(symbol: str, filing_year: Optional[int] = None) -> Dict[str, Any]:
    """
    提取风险因素部分 (10-K第1A节)

    Args:
        symbol: 股票代码如AAPL, TSLA, MSFT等
        filing_year: 可选的具体年份

    Returns:
        包含风险因素数据和元数据的字典
    """
    try:
        # 查找最近的10-K文件
        query_string = f'ticker:{symbol.upper()} AND formType:"10-K"'
        if filing_year:
            query_string += f' AND filedAt:{{{filing_year}-01-01 TO {filing_year}-12-31}}'

        search_query = {
            'query': query_string,
            'from': '0',
            'size': '1',
            'sort': [{'filedAt': {'order': 'desc'}}]
        }

        search_results = await make_sec_api_request('', search_query)

        if not search_results.get('filings') or len(search_results['filings']) == 0:
            year_text = f" in {filing_year}" if filing_year else ""
            return {
                'error': f'No 10-K filings found for {symbol}{year_text}',
                'success': False
            }

        filing = search_results['filings'][0]

        # 提取风险因素 (第1A节)
        extractor_params = {
            'url': filing['linkToFilingDetails'],
            'item': '1A'
        }

        extracted_data = await make_sec_api_request('/extractor', extractor_params)

        return {
            'success': True,
            'company': {
                'symbol': symbol.upper(),
                'name': filing['companyName'],
                'cik': filing['cik']
            },
            'filing': {
                'type': '10-K',
                'date': filing['filedAt'],
                'period': filing['periodOfReport'],
                'accessionNumber': filing['accessionNo'],
                'url': filing['linkToFilingDetails']
            },
            'riskFactors': {
                'title': 'Risk Factors',
                'content': extracted_data or '',
                'wordCount': len((extracted_data or '').split()),
                'keyRisks': extract_key_risks(extracted_data or ''),
                'riskCategories': categorize_risks(extracted_data or '')
            },
            'metadata': {
                'extractedAt': datetime.now().isoformat(),
                'dataSource': 'SEC-API.io'
            }
        }

    except Exception as error:
        return {
            'error': f'Failed to extract Risk Factors: {str(error)}',
            'success': False
        }


async def extract_business_overview(symbol: str, filing_year: Optional[int] = None) -> Dict[str, Any]:
    """
    提取业务概述部分 (10-K第1节)

    Args:
        symbol: 股票代码如AAPL, TSLA, MSFT等
        filing_year: 可选的具体年份

    Returns:
        包含业务概述数据和元数据的字典
    """
    try:
        # 查找最近的10-K文件
        query_string = f'ticker:{symbol.upper()} AND formType:"10-K"'
        if filing_year:
            query_string += f' AND filedAt:{{{filing_year}-01-01 TO {filing_year}-12-31}}'

        search_query = {
            'query': query_string,
            'from': '0',
            'size': '1',
            'sort': [{'filedAt': {'order': 'desc'}}]
        }

        search_results = await make_sec_api_request('', search_query)

        if not search_results.get('filings') or len(search_results['filings']) == 0:
            year_text = f" in {filing_year}" if filing_year else ""
            return {
                'error': f'No 10-K filings found for {symbol}{year_text}',
                'success': False
            }

        filing = search_results['filings'][0]

        # 提取业务部分 (第1节)
        extractor_params = {
            'url': filing['linkToFilingDetails'],
            'item': '1'
        }

        extracted_data = await make_sec_api_request('/extractor', extractor_params)

        return {
            'success': True,
            'company': {
                'symbol': symbol.upper(),
                'name': filing['companyName'],
                'cik': filing['cik']
            },
            'filing': {
                'type': '10-K',
                'date': filing['filedAt'],
                'period': filing['periodOfReport'],
                'accessionNumber': filing['accessionNo'],
                'url': filing['linkToFilingDetails']
            },
            'businessOverview': {
                'title': 'Business',
                'content': extracted_data or '',
                'wordCount': len((extracted_data or '').split()),
                'keyPoints': extract_business_key_points(extracted_data or ''),
                'businessSegments': extract_business_segments(extracted_data or '')
            },
            'metadata': {
                'extractedAt': datetime.now().isoformat(),
                'dataSource': 'SEC-API.io'
            }
        }

    except Exception as error:
        return {
            'error': f'Failed to extract Business Overview: {str(error)}',
            'success': False
        }


# 辅助函数：从MD&A提取关键主题
def extract_key_topics(content: str) -> List[str]:
    """从MD&A内容中提取关键主题"""
    topics = []
    lower_content = content.lower()

    # 寻找常见MD&A主题
    topic_keywords = [
        'revenue', 'sales', 'income', 'profit', 'margin', 'cash flow',
        'acquisition', 'merger', 'expansion', 'growth', 'market share',
        'competition', 'regulation', 'currency', 'commodity', 'debt',
        'liquidity', 'capital', 'investment', 'dividend', 'restructuring'
    ]

    for keyword in topic_keywords:
        if keyword in lower_content:
            topics.append(keyword)

    return topics[:10]  # 返回前10个主题


def generate_mda_summary(content: str) -> str:
    """生成MD&A摘要"""
    if not content:
        return 'No content available'

    sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 50]
    first_two_sentences = '. '.join(sentences[:2])

    return first_two_sentences + ('...' if len(sentences) > 2 else '')


def extract_key_risks(content: str) -> List[str]:
    """提取关键风险"""
    risks = []
    paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 100]

    # 提取每个段落的第一句话作为潜在风险
    for paragraph in paragraphs[:10]:
        first_sentence = re.split(r'[.!?]', paragraph)[0].strip()
        if first_sentence and len(first_sentence) > 30:
            risks.append(first_sentence)

    return risks


def categorize_risks(content: str) -> List[str]:
    """对风险进行分类"""
    categories = []
    lower_content = content.lower()

    risk_categories = {
        'Market Risk': ['market', 'economic', 'recession', 'volatility'],
        'Operational Risk': ['operational', 'supply chain', 'manufacturing', 'production'],
        'Regulatory Risk': ['regulatory', 'compliance', 'government', 'legislation'],
        'Competitive Risk': ['competition', 'competitive', 'market share', 'rivals'],
        'Financial Risk': ['financial', 'credit', 'liquidity', 'debt', 'cash'],
        'Technology Risk': ['technology', 'cybersecurity', 'data', 'systems']
    }

    for category, keywords in risk_categories.items():
        if any(keyword in lower_content for keyword in keywords):
            categories.append(category)

    return categories


def extract_business_key_points(content: str) -> List[str]:
    """提取业务关键点"""
    points = []
    sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 50]

    # 寻找描述关键业务活动的句子
    keyword_patterns = [
        re.compile(r'we (operate|provide|offer|manufacture|develop|sell)', re.IGNORECASE),
        re.compile(r'our (business|operations|products|services|strategy)', re.IGNORECASE),
        re.compile(r'the company (focuses|specializes|operates|provides)', re.IGNORECASE)
    ]

    for sentence in sentences[:20]:
        if any(pattern.search(sentence) for pattern in keyword_patterns):
            points.append(sentence)

    return points[:5]


def extract_business_segments(content: str) -> List[str]:
    """提取业务分部"""
    segments = []

    # 寻找常见的业务分部指标
    segment_indicators = [
        'segment', 'division', 'business unit', 'subsidiary',
        'geography', 'region', 'product line', 'service area'
    ]

    paragraphs = content.split('\n\n')
    for paragraph in paragraphs:
        if any(indicator in paragraph.lower() for indicator in segment_indicators):
            first_sentence = re.split(r'[.!?]', paragraph)[0].strip()
            if first_sentence and len(first_sentence) > 30:
                segments.append(first_sentence)

    return segments[:5]