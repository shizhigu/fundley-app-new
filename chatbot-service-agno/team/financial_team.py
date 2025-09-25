"""
Fundley Financial Team - Agno Team Coordination
Multi-agent system using Agno's Team concept for intelligent financial analysis
"""
import os
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from agno.team import Team
from agno.db.postgres import PostgresDb
from agno.models.openai import OpenAIChat
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our custom agents
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from agents.financial_analyst import FinancialAnalyst, MarketResearcher

# Import tools for team-level coordination
from tools.web_search_tool import web_search
from tools.sec_filings_tool import extract_mda, extract_risk_factors, extract_business_overview


class FinancialTeam(Team):
    """
    Fundley Financial Analysis Team

    Features:
    - Intelligent task routing between Financial Analyst and Market Researcher
    - Automatic agent coordination and result synthesis
    - Built-in streaming support via Agno Team
    - Session/user memory management
    - Real-time collaboration between agents
    """

    def __init__(self, db_url: Optional[str] = None):
        if not db_url:
            db_url = os.getenv("DATABASE_URL", "postgresql://ai:ai@localhost:5532/ai")

        db = PostgresDb(db_url=db_url)

        # Initialize our specialized agents
        self.financial_analyst = FinancialAnalyst(db_url=db_url)
        self.market_researcher = MarketResearcher(db_url=db_url)

        # Team-level tools for coordination
        team_tools = [
            web_search,
            extract_mda,
            extract_risk_factors,
            extract_business_overview
        ]

        super().__init__(
            name="Fundley Financial Team",
            agents=[self.financial_analyst, self.market_researcher],
            model=OpenAIChat(id="gpt-4"),  # Team coordinator model
            db=db,
            tools=team_tools,
            enable_user_memories=True,
            enable_session_summaries=True,
            markdown=True,
            description="""
            🏦 **Fundley Financial Analysis Team**

            Multi-agent financial analysis system specializing in:

            **Team Structure:**
            - 📊 **Financial Analyst**: Company fundamentals, financial data, ratios analysis
            - 📈 **Market Researcher**: Market trends, sector analysis, news sentiment

            **Coordination Strategy:**
            1. **Task Analysis**: Determine which agent(s) best handle the request
            2. **Parallel Execution**: Multiple agents work simultaneously when possible
            3. **Result Synthesis**: Combine insights from multiple agents
            4. **Quality Assurance**: Cross-validate findings between agents

            **Available Capabilities:**
            - Real-time financial data analysis (FMP API)
            - Market research and news analysis
            - SEC filings analysis (10-K, 10-Q)
            - Custom SQL queries on MotherDuck database
            - Interactive financial visualizations
            - Multi-language support (English, Chinese)

            **Response Philosophy:**
            - Provide comprehensive yet concise analysis
            - Support findings with specific data and sources
            - Adapt detail level to user's sophistication
            - Focus on actionable investment insights
            """,
            instructions=[
                "Analyze user requests to determine optimal agent assignment",
                "Route financial data queries to Financial Analyst",
                "Route market trend queries to Market Researcher",
                "Use parallel processing when multiple agents can contribute",
                "Synthesize results from multiple agents into coherent responses",
                "Maintain professional tone while being accessible",
                "Always cite data sources and provide context",
                "Ask clarifying questions when analysis scope is unclear"
            ]
        )

    async def analyze_request(self, query: str, user_id: str) -> str:
        """
        Main entry point for financial analysis requests

        Features Agno Team's intelligent routing:
        1. Query analysis and agent selection
        2. Parallel execution when beneficial
        3. Result synthesis and presentation
        """

        # Log team activation
        print(f"🏦 Fundley Financial Team activated")
        print(f"📋 Query: {query}")
        print(f"👤 User: {user_id}")
        print(f"⏰ Time: {datetime.now().isoformat()}")

        # Use Agno Team's built-in arun for coordination
        # Team will automatically:
        # 1. Analyze the query
        # 2. Select appropriate agent(s)
        # 3. Execute in parallel if beneficial
        # 4. Synthesize results
        response = await self.arun(
            input=query,
            user_id=user_id,
            stream=True  # Enable streaming for real-time responses
        )

        return response

    async def portfolio_analysis(self, symbols: List[str], user_id: str) -> str:
        """
        Specialized portfolio analysis using both agents

        Workflow:
        1. Financial Analyst: Individual company fundamentals
        2. Market Researcher: Sector and market context
        3. Team Synthesis: Portfolio-level insights
        """

        portfolio_prompt = f"""
        Perform comprehensive portfolio analysis for: {', '.join(symbols)}

        **Analysis Framework:**
        1. **Individual Company Analysis** (Financial Analyst)
           - Financial health and ratios
           - Growth trends and profitability
           - Valuation metrics

        2. **Market Context** (Market Researcher)
           - Sector performance and trends
           - Market sentiment and news impact
           - Competitive positioning

        3. **Portfolio Synthesis**
           - Diversification analysis
           - Risk assessment
           - Investment recommendations

        User ID: {user_id}
        """

        return await self.analyze_request(portfolio_prompt, user_id)

    async def company_deep_dive(self, symbol: str, user_id: str) -> str:
        """
        Deep company analysis using all available tools and agents

        Combines:
        - Financial data analysis
        - SEC filings analysis
        - Market research
        - Competitive analysis
        """

        deep_dive_prompt = f"""
        Conduct comprehensive deep-dive analysis for {symbol}:

        **Multi-Agent Analysis Plan:**

        1. **Financial Foundation** (Financial Analyst)
           - Latest financial statements and ratios
           - Historical performance trends
           - Valuation and growth metrics

        2. **Regulatory Insights** (Team Tools)
           - SEC 10-K business overview and strategy
           - Management discussion and analysis (MD&A)
           - Risk factors assessment

        3. **Market Intelligence** (Market Researcher)
           - Recent news and developments
           - Sector trends and peer comparison
           - Market sentiment analysis

        4. **Investment Thesis**
           - Synthesize all findings
           - Provide balanced investment perspective
           - Highlight key risks and opportunities

        User ID: {user_id}
        """

        return await self.analyze_request(deep_dive_prompt, user_id)


# Team factory function for easy instantiation
def create_financial_team(db_url: Optional[str] = None) -> FinancialTeam:
    """
    Factory function to create Financial Team instance

    Benefits of Team approach:
    - Intelligent task routing
    - Parallel agent execution
    - Automatic result synthesis
    - Built-in streaming support
    - Session and user memory
    """
    return FinancialTeam(db_url=db_url)


# Demo usage for testing
async def demo_team_usage():
    """Demo showing team capabilities"""

    print("🚀 Initializing Fundley Financial Team...")
    team = create_financial_team()

    # Test basic analysis
    print("\n📊 Testing basic stock analysis...")
    result = await team.analyze_request(
        "Analyze AAPL's financial performance and provide investment insights",
        user_id="demo_user"
    )
    print(f"Result: {result}")

    # Test portfolio analysis
    print("\n📈 Testing portfolio analysis...")
    portfolio_result = await team.portfolio_analysis(
        symbols=["AAPL", "MSFT", "NVDA"],
        user_id="demo_user"
    )
    print(f"Portfolio Result: {portfolio_result}")

    print("\n✅ Team demo completed successfully!")


if __name__ == "__main__":
    # Run demo
    asyncio.run(demo_team_usage())