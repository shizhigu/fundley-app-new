"""
财务分析专家 Agent - Agno版本
替代ADK的复杂结构，用简单的Python类实现
"""
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.db.postgres import PostgresDb
import os
from typing import Optional

# 导入现有工具 (直接复用，无需修改)
from tools.financial_tools import (
    get_company_profile,
    get_financial_statements,
    get_key_metrics,
    search_web_for_stock_info
)
from tools.sql_query_tool import execute_sql_query
from tools.create_visualization_tool import create_financial_chart


def get_custom_metrics(user_id: str) -> str:
    """获取用户自定义指标 - 简单Python函数，无需复杂框架"""
    # 这里可以直接调用PostgreSQL查询
    # 比ADK的context变量简单太多
    return f"Custom metrics for user {user_id}: ROE, Custom Ratios, etc."


class FinancialAnalyst(Agent):
    """
    财务分析专家Agent

    特点：
    - 纯Python类，无复杂抽象
    - 直接继承Agno Agent
    - 内置streaming支持
    - 自动session/user管理
    """

    def __init__(self, db_url: Optional[str] = None):
        # 数据库配置 (支持PostgreSQL/SQLite)
        if not db_url:
            db_url = os.getenv("DATABASE_URL", "postgresql://ai:ai@localhost:5532/ai")

        db = PostgresDb(db_url=db_url)

        # 工具列表 - 直接使用Python函数，无需复杂注册
        tools = [
            get_company_profile,
            get_financial_statements,
            get_key_metrics,
            search_web_for_stock_info,
            execute_sql_query,
            create_financial_chart,
            get_custom_metrics  # 新的自定义指标工具
        ]

        super().__init__(
            name="Financial Analyst",
            role="Expert financial analyst specializing in equity research and market analysis",
            model=OpenAIChat(id="gpt-4"),  # 可配置模型
            tools=tools,
            db=db,
            enable_user_memories=True,    # 用户记忆
            enable_session_summaries=True, # 会话总结
            add_history_to_context=True,   # 历史对话
            markdown=True,                 # Markdown输出
            description="""
            You are Fundley's AI Financial Analyst, specialized in:

            📊 **Financial Analysis**: Company fundamentals, ratios, performance metrics
            📈 **Market Research**: Stock prices, trends, sector analysis
            📋 **Custom Metrics**: User-defined financial calculations and KPIs
            🔍 **SQL Queries**: MotherDuck database analysis for historical data
            📊 **Visualizations**: Charts and graphs for financial data

            **Key Instructions:**
            - Always provide data-driven insights with sources
            - Use custom_metrics when users ask about their saved calculations
            - Create visualizations for numerical data when helpful
            - Maintain professional, concise communication
            - Ask clarifying questions when analysis scope is unclear
            """,
            instructions=[
                "Be concise and data-driven in your analysis",
                "Always cite data sources and dates",
                "Use visualizations when presenting numerical data",
                "Ask clarifying questions for complex queries",
                "Leverage custom metrics when relevant to user queries"
            ]
        )

    async def analyze_stock(self, symbol: str, user_id: str) -> str:
        """
        股票分析专用方法 - 展示Agno的简洁性
        比ADK的复杂流程简单很多
        """
        # 使用Agno的arun方法，内置streaming
        analysis_prompt = f"""
        Perform comprehensive analysis for {symbol}:
        1. Company profile and business overview
        2. Key financial metrics and ratios
        3. Recent performance and trends
        4. Custom metrics relevant to user {user_id}
        5. Create visualization of key metrics

        Provide actionable insights and investment perspective.
        """

        # 一行代码搞定streaming分析，比ADK简单太多
        response = await self.arun(
            input=analysis_prompt,
            user_id=user_id,
            stream=True
        )

        return response


class MarketResearcher(Agent):
    """
    市场研究专家 - 第二个Agent
    """

    def __init__(self, db_url: Optional[str] = None):
        if not db_url:
            db_url = os.getenv("DATABASE_URL", "postgresql://ai:ai@localhost:5532/ai")

        db = PostgresDb(db_url=db_url)

        tools = [
            search_web_for_stock_info,
            execute_sql_query,
            create_financial_chart
        ]

        super().__init__(
            name="Market Researcher",
            role="Market trends and sector analysis specialist",
            model=OpenAIChat(id="gpt-4"),
            tools=tools,
            db=db,
            enable_user_memories=True,
            markdown=True,
            description="""
            Market Research Specialist focused on:

            🌍 **Market Trends**: Sector performance, economic indicators
            📊 **Comparative Analysis**: Peer comparison, industry benchmarks
            📈 **Technical Analysis**: Price patterns, trading volumes
            🔍 **News & Events**: Market-moving events and sentiment

            Provide macro-level insights and market context for investment decisions.
            """,
            instructions=[
                "Focus on market-level trends and patterns",
                "Provide comparative industry context",
                "Include recent news and market sentiment",
                "Use technical analysis when relevant"
            ]
        )