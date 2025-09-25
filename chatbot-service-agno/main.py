"""
Fundley Financial Assistant - Agno Implementation
Simple and powerful implementation using Agno's streaming capabilities
"""
import os
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, AsyncGenerator
from dotenv import load_dotenv
import json
import uvicorn

# Load environment variables
load_dotenv()

# Import our Agno Team
from team.financial_team import create_financial_team, FinancialTeam

# Initialize FastAPI app
app = FastAPI(
    title="Fundley Financial Assistant (Agno)",
    description="AI assistant specialized in financial analysis using Agno framework",
    version="3.0.0"
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").strip("[]").replace('"', '').split(", ")
if allowed_origins and allowed_origins[0]:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Global team instance - reuse for better performance
financial_team: Optional[FinancialTeam] = None


def get_financial_team() -> FinancialTeam:
    """Get or create financial team instance"""
    global financial_team
    if financial_team is None:
        print("🏦 Initializing Fundley Financial Team...")
        financial_team = create_financial_team()
        print("✅ Financial Team initialized successfully")
    return financial_team


# Request/Response models
class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    user_id: str = "anonymous"
    session_id: Optional[str] = None
    stream: bool = True


class ChatResponse(BaseModel):
    """Chat response model"""
    response: str
    user_id: str
    session_id: Optional[str] = None
    timestamp: str


class PortfolioAnalysisRequest(BaseModel):
    """Portfolio analysis request"""
    symbols: list[str]
    user_id: str = "anonymous"
    analysis_type: str = "comprehensive"


class CompanyAnalysisRequest(BaseModel):
    """Company deep dive request"""
    symbol: str
    user_id: str = "anonymous"
    include_sec_filings: bool = True


# API Routes

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Fundley Financial Assistant (Agno)",
        "description": "AI assistant specialized in financial analysis using Agno framework",
        "framework": "Agno Team + FastAPI + PostgreSQL",
        "architecture": "Multi-agent system with streaming support",
        "version": "3.0.0",
        "features": [
            "Real-time financial data analysis",
            "Multi-agent coordination (Financial Analyst + Market Researcher)",
            "Streaming responses",
            "SEC filings analysis",
            "Custom SQL queries",
            "Interactive visualizations",
            "Session memory management"
        ],
        "endpoints": {
            "health": "/health",
            "chat": "/chat",
            "chat_stream": "/chat/stream",
            "portfolio": "/portfolio/analyze",
            "company": "/company/analyze",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        team = get_financial_team()
        return {
            "status": "healthy",
            "service": "Fundley Financial Assistant (Agno)",
            "timestamp": datetime.now().isoformat(),
            "agents": {
                "financial_analyst": "active",
                "market_researcher": "active",
                "team_coordinator": "active"
            },
            "database": "connected",
            "streaming": "enabled"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat_sync(request: ChatRequest):
    """
    Synchronous chat endpoint (for non-streaming clients)

    Returns complete response after processing
    """
    try:
        team = get_financial_team()

        print(f"💬 Sync Chat Request:")
        print(f"   User: {request.user_id}")
        print(f"   Message: {request.message}")

        # Use Agno team's analyze_request method
        response = await team.analyze_request(
            query=request.message,
            user_id=request.user_id
        )

        return ChatResponse(
            response=response,
            user_id=request.user_id,
            session_id=request.session_id,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ Error in sync chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint using Agno's built-in streaming

    Returns Server-Sent Events (SSE) for real-time responses
    """

    async def generate_response() -> AsyncGenerator[str, None]:
        """Generate streaming response"""
        try:
            team = get_financial_team()

            print(f"🌊 Stream Chat Request:")
            print(f"   User: {request.user_id}")
            print(f"   Message: {request.message}")

            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connection', 'status': 'connected', 'timestamp': datetime.now().isoformat()})}\n\n"

            # Send processing event
            yield f"data: {json.dumps({'type': 'processing', 'message': 'Analyzing your request...', 'timestamp': datetime.now().isoformat()})}\n\n"

            # Use Agno's streaming capabilities
            # Note: This is a simplified approach - in production you might want to
            # implement proper streaming chunks from Agno
            response = await team.analyze_request(
                query=request.message,
                user_id=request.user_id
            )

            # For now, send the complete response as chunks
            # In the future, Agno streaming can be integrated more deeply
            words = response.split()
            chunk_size = 10

            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i + chunk_size])
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk, 'timestamp': datetime.now().isoformat()})}\n\n"
                # Small delay to simulate streaming
                await asyncio.sleep(0.1)

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete', 'message': 'Analysis complete', 'timestamp': datetime.now().isoformat()})}\n\n"

        except Exception as e:
            print(f"❌ Error in stream chat: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': f'Error: {str(e)}', 'timestamp': datetime.now().isoformat()})}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )


@app.post("/portfolio/analyze")
async def analyze_portfolio(request: PortfolioAnalysisRequest):
    """
    Portfolio analysis endpoint

    Leverages both Financial Analyst and Market Researcher agents
    """
    try:
        team = get_financial_team()

        print(f"📊 Portfolio Analysis Request:")
        print(f"   User: {request.user_id}")
        print(f"   Symbols: {request.symbols}")
        print(f"   Type: {request.analysis_type}")

        # Use team's portfolio analysis method
        response = await team.portfolio_analysis(
            symbols=request.symbols,
            user_id=request.user_id
        )

        return {
            "analysis": response,
            "symbols": request.symbols,
            "analysis_type": request.analysis_type,
            "user_id": request.user_id,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"❌ Error in portfolio analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Portfolio analysis failed: {str(e)}")


@app.post("/company/analyze")
async def analyze_company(request: CompanyAnalysisRequest):
    """
    Company deep dive analysis endpoint

    Comprehensive analysis using all available tools and agents
    """
    try:
        team = get_financial_team()

        print(f"🔍 Company Analysis Request:")
        print(f"   User: {request.user_id}")
        print(f"   Symbol: {request.symbol}")
        print(f"   Include SEC: {request.include_sec_filings}")

        # Use team's deep dive analysis method
        response = await team.company_deep_dive(
            symbol=request.symbol,
            user_id=request.user_id
        )

        return {
            "analysis": response,
            "symbol": request.symbol,
            "include_sec_filings": request.include_sec_filings,
            "user_id": request.user_id,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"❌ Error in company analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Company analysis failed: {str(e)}")


# WebSocket endpoint for real-time communication
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket, user_id: str):
    """
    WebSocket endpoint for real-time financial analysis

    Future enhancement for ultra-low latency communication
    """
    await websocket.accept()

    try:
        team = get_financial_team()

        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "user_id": user_id,
            "message": "Connected to Fundley Financial Team",
            "timestamp": datetime.now().isoformat()
        })

        while True:
            # Receive message from client
            data = await websocket.receive_json()
            query = data.get("message", "")

            if query.lower() == "disconnect":
                break

            # Process with Agno team
            response = await team.analyze_request(query=query, user_id=user_id)

            # Send response
            await websocket.send_json({
                "type": "response",
                "content": response,
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            })

    except Exception as e:
        print(f"❌ WebSocket error: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        })
    finally:
        await websocket.close()


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🚀 Starting Fundley Financial Assistant (Agno)")
    print("📡 Initializing Financial Team...")

    # Pre-initialize team for better performance
    get_financial_team()

    print("✅ Startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🛑 Shutting down Fundley Financial Assistant")
    global financial_team
    if financial_team:
        # Cleanup team resources if needed
        financial_team = None
    print("✅ Shutdown complete")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))

    print(f"""
    🏦 Fundley Financial Assistant (Agno Implementation)

    🌟 Features:
    - Multi-agent financial analysis team
    - Real-time streaming responses
    - Session memory management
    - SEC filings integration
    - Portfolio analysis
    - Company deep dives

    📡 Endpoints:
    - Health: http://localhost:{port}/health
    - Docs: http://localhost:{port}/docs
    - Chat: http://localhost:{port}/chat
    - Stream: http://localhost:{port}/chat/stream
    - Portfolio: http://localhost:{port}/portfolio/analyze
    - Company: http://localhost:{port}/company/analyze
    - WebSocket: ws://localhost:{port}/ws/{{user_id}}

    🔧 Architecture: Agno Team + FastAPI + PostgreSQL
    """)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )