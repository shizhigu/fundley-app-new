# Financial News Causal Analysis & Logic Chain Construction - Design Document

## Executive Summary

本设计文档基于2024-2025年金融AI、因果推理、知识图谱领域的前沿研究,提出Fundley新闻分析系统的技术架构。核心目标:**从海量新闻中构建因果逻辑链,支持深度分析场景(如"NVDA供应链发展逻辑"),同时解决token爆炸问题**。

## 1. 问题定义

### 1.1 核心挑战

**业务需求:**
- 用户/Agent需要从海量新闻中找到相关新闻
- 构建逻辑关系链条(如供应链发展→产能扩张→收入增长)
- 支持深度归因分析(如"为什么NVDA Q3收入超预期?")

**技术难点:**
1. **Token爆炸**: 每条新闻content字段可达数千tokens,10-20条新闻就会超出LLM上下文窗口
2. **因果关系抽取**: 如何识别新闻间的因果关系?(A事件导致B事件)
3. **逻辑链构建**: 如何将离散的新闻事件组织成coherent narrative?
4. **实时性vs完整性**: 如何平衡最新新闻获取与历史知识库检索?

### 1.2 传统方案的局限性

**方案A: 仅用title构建逻辑链**
- ❌ 问题: Title缺乏细节,因果关系判断不准确
- 例如: "NVDA宣布新产品" vs "NVDA新产品因供应链问题延迟"

**方案B: 全文检索+直接喂给LLM**
- ❌ 问题: Token爆炸,成本高,响应慢
- 10条新闻 × 2000 tokens = 20K tokens输入

**方案C: 简单摘要后检索**
- ❌ 问题: 丢失因果关系细节,chain of logic断裂

## 2. 前沿研究综述

### 2.1 Graph RAG (Microsoft Research, 2024)

**核心创新:**
- 将文档构建为知识图谱,使用社区检测(Leiden算法)分层聚类
- 分层摘要: 叶节点→社区摘要→全局摘要
- **Token效率**: Root-level摘要相比源文本减少97% tokens

**对我们的启示:**
- 新闻不应该是扁平的list,而应该是graph
- 分层摘要可以极大减少token消耗
- 社区检测可以自动发现相关新闻cluster

### 2.2 CAMEF (Causal-Augmented Multi-Modality, 2025)

**核心创新:**
- 使用LLM生成反事实事件(counterfactual events)
- 通过对比学习建立因果关系: ground-truth event与counterfactual event的embedding距离
- 整合文本+时间序列数据

**对我们的启示:**
- 因果关系可以通过counterfactual reasoning学习
- LLM可以理解"如果事件X没有发生,Y会怎样?"
- 事件与时间序列(股价、收入)的关联可以强化因果判断

### 2.3 Voyage Context-3 Embeddings (Voyage AI, 2025)

**核心创新:**
- Contextualized chunk embeddings: 每个chunk的embedding同时包含:
  1. Chunk内部细节信息
  2. 全文档的coarse-grained context
- 专为高敏感度检索任务设计(金融、医疗、法律)

**对我们的启示:**
- 新闻chunking不会丢失全文context
- voyage-finance-2模型专为金融文档优化
- 可以安全地chunking长新闻,检索时不会丢失上下文

### 2.4 FinCaKG-Onto (Financial Causal Knowledge Graph, 2025)

**核心发现:**
- 因果关系是金融推理的核心
- 现有知识图谱在causality方面效果不佳
- 需要domain-specific ontology来表示金融因果关系

### 2.5 Hierarchical Retrieval with Evidence Curation (HiREC, 2024)

**核心创新:**
- 分层检索: 粗粒度筛选→细粒度证据提取
- Evidence curation: 在answer generation前过滤irrelevant passages
- **Token效率**: 比baseline少用显著tokens且成本更低

## 3. 设计方案: Hierarchical Causal Event Graph (HCEG)

### 3.1 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    User/Agent Query                              │
│     "分析NVDA供应链发展逻辑" / "为什么Q3收入超预期?"              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  Query Understanding Agent                       │
│  • Extract: Entity (NVDA), Intent (supply chain logic)          │
│  • Temporal Scope: Recent 6 months                              │
│  • Event Types: Supply chain, product launch, earnings          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Dual-Track News Retrieval                           │
│  Track 1: Real-time API Fetch (EODHD) ─────┐                    │
│  Track 2: Vector DB Search (Qdrant) ───────┤                    │
└────────────────────────┬───────────────────┴────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│            News Ingestion & Event Extraction                     │
│  • LLM Extract: [Entity, Event Type, Timestamp, Sentiment]      │
│  • Chunking: Voyage-context-3 (preserve context)                │
│  • Deduplication: By link hash                                  │
│  • Store: Qdrant (vector) + Event metadata                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│          Causal Event Graph Construction                         │
│  • Nodes: Events (entity, type, time, sentiment)                │
│  • Edges: Causal relations (LLM判断 + 时间顺序)                  │
│  • Communities: Leiden算法聚类相关事件                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│         Hierarchical Summarization (3 Levels)                    │
│  L0 (Event): Single event summary (100 tokens)                  │
│  L1 (Community): Event cluster logic (300 tokens)               │
│  L2 (Global): Overall narrative (500 tokens)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Logic Chain Construction                            │
│  • Temporal Ordering: 按时间排序事件                              │
│  • Causal Pruning: 移除低相关性边                                 │
│  • Narrative Generation: LLM生成coherent story                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  Response to User                                │
│  • Analysis Block: Title + Summary + Logic Chain                │
│  • Evidence: Key events with links                              │
│  • Insights: Causal attribution                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 关键组件详细设计

#### 3.2.1 News Ingestion Pipeline

**Step 1: Fetch & Deduplicate**
```python
# EODHD API调用
news_items = fetch_eodhd_news(symbol="AAPL", limit=50)

# Link-based去重
for news in news_items:
    link_hash = hashlib.sha256(news['link'].encode()).hexdigest()
    if not exists_in_qdrant(link_hash):
        process_news(news)
```

**Step 2: Event Extraction (LLM-based)**
```python
# 使用small LLM提取结构化事件
prompt = f"""
Extract structured events from this news article:

Title: {news['title']}
Content: {news['content'][:1000]}  # 只用前1000字符做event extraction

Extract:
1. Primary Entity: (e.g., NVDA, TSMC, Microsoft)
2. Event Type: (e.g., product_launch, supply_chain, earnings, partnership, regulatory)
3. Event Summary: (1 sentence, <50 words)
4. Causal Indicators: (words like "due to", "led to", "resulted in", "because")
5. Sentiment: (positive/negative/neutral)
6. Timestamp: {news['date']}

Return JSON.
"""

event = llm_extract(prompt, model="gpt-4o-mini")  # 便宜快速的模型
```

**Step 3: Contextualized Chunking**
```python
# Voyage-context-3 embeddings
chunks = chunk_content(
    news['content'],
    chunk_size=512,
    overlap=50
)

embeddings = voyage_embed(
    chunks,
    model="voyage-context-3",
    input_type="document"
)

# 存储到Qdrant
qdrant_client.upsert(
    collection_name="financial_news",
    points=[
        {
            "id": link_hash,
            "vector": embedding,
            "payload": {
                "link": news['link'],
                "title": news['title'],
                "chunk_text": chunk,
                "event": event,  # 结构化事件
                "symbols": news['symbols'],
                "date": news['date'],
                "sentiment": news['sentiment']
            }
        }
        for chunk, embedding in zip(chunks, embeddings)
    ]
)
```

#### 3.2.2 Causal Event Graph Construction

**Graph Schema:**
```python
class EventNode:
    id: str  # link_hash
    entity: str  # NVDA, TSMC
    event_type: str  # supply_chain, product_launch
    summary: str  # 1-sentence event description
    timestamp: datetime
    sentiment: float
    embedding: np.ndarray  # Voyage embedding
    source_link: str

class CausalEdge:
    source_event: EventNode
    target_event: EventNode
    relation_type: str  # "causes", "enables", "precedes"
    confidence: float  # 0-1
    reasoning: str  # LLM生成的causality解释
```

**Building the Graph:**
```python
# Step 1: 检索相关事件节点
query_embedding = voyage_embed(user_query, input_type="query")
candidate_events = qdrant_client.search(
    collection_name="financial_news",
    query_vector=query_embedding,
    limit=100,  # 召回100个候选事件
    filter={
        "must": [
            {"key": "symbols", "match": {"any": ["NVDA"]}},
            {"key": "date", "range": {"gte": "2024-04-01"}}
        ]
    }
)

# Step 2: 构建event nodes
events = [EventNode.from_qdrant(hit) for hit in candidate_events]

# Step 3: LLM判断因果关系(batch processing)
# 不是所有event pair都判断,只判断时间上相邻+embedding相似的
causal_edges = []
for i, event_a in enumerate(events):
    # 找到时间上在event_a之后,且embedding相似的events
    temporal_candidates = [
        e for e in events[i+1:]
        if e.timestamp > event_a.timestamp
        and cosine_similarity(event_a.embedding, e.embedding) > 0.7
    ][:5]  # 最多5个候选

    if temporal_candidates:
        # Batch判断因果关系
        edges = llm_judge_causality_batch(event_a, temporal_candidates)
        causal_edges.extend(edges)

# Step 4: 构建NetworkX图
G = nx.DiGraph()
G.add_nodes_from([(e.id, e.__dict__) for e in events])
G.add_edges_from([
    (edge.source_event.id, edge.target_event.id, edge.__dict__)
    for edge in causal_edges
])
```

**LLM Causality Judgment (Batch):**
```python
def llm_judge_causality_batch(event_a: EventNode, candidates: List[EventNode]):
    """
    使用LLM判断event_a与candidates的因果关系

    关键: 只用event summary,不用full content → 节省tokens
    """
    prompt = f"""
You are a financial analyst expert in causal reasoning.

Event A (happened on {event_a.timestamp}):
- Entity: {event_a.entity}
- Type: {event_a.event_type}
- Summary: {event_a.summary}

Later Events (happened after Event A):
{chr(10).join([
    f"{i+1}. [{e.timestamp}] {e.entity} - {e.event_type}: {e.summary}"
    for i, e in enumerate(candidates)
])}

For each later event, determine:
1. Is there a causal relationship with Event A?
2. Relation type: "causes" (A直接导致), "enables" (A为B创造条件), "precedes" (仅时间先后)
3. Confidence: 0-1
4. One-sentence reasoning

Return JSON array.
"""

    result = llm_call(prompt, model="gpt-4o")  # 需要reasoning能力,用好模型
    return parse_causal_edges(result, event_a, candidates)
```

**Token Cost Analysis:**
- Event summary: ~50 tokens/event
- 1个event_a + 5个candidates = 50 + 5×50 = 300 tokens
- 100个events,平均每个event判断3次 = 100 × 300 = 30K tokens
- 成本: ~$0.30 (gpt-4o-mini) per analysis

#### 3.2.3 Hierarchical Summarization (Graph RAG方法)

**Community Detection:**
```python
# 使用Leiden算法聚类
from networkx.algorithms import community

# 转换为无向图用于社区检测
G_undirected = G.to_undirected()

# Leiden算法
communities = community.louvain_communities(G_undirected)

# 分层: L0 (events) → L1 (communities) → L2 (global)
hierarchy = {
    "L0": events,  # 100 events
    "L1": communities,  # ~10-20 communities
    "L2": "global"
}
```

**L1 Community Summarization:**
```python
def summarize_community(community_events: List[EventNode]) -> str:
    """
    为一个community生成摘要

    Token budget: 300 tokens
    """
    # 按时间排序
    sorted_events = sorted(community_events, key=lambda e: e.timestamp)

    # 提取因果链
    causal_chain = extract_causal_chain(G, sorted_events)

    prompt = f"""
Summarize this cluster of related financial events into a coherent narrative.

Events (chronological order):
{chr(10).join([
    f"- [{e.timestamp.strftime('%Y-%m-%d')}] {e.summary}"
    for e in sorted_events
])}

Causal relationships:
{chr(10).join([
    f"- {edge.source_event.summary} → {edge.target_event.summary} ({edge.reasoning})"
    for edge in causal_chain
])}

Generate:
1. Theme: What is this cluster about? (1 phrase)
2. Narrative: Causal logic chain (3-5 sentences, <200 words)
3. Impact: What's the business impact? (1 sentence)

Keep it concise and focus on causality.
"""

    summary = llm_call(prompt, model="gpt-4o")
    return summary
```

**L2 Global Narrative:**
```python
def generate_global_narrative(community_summaries: List[str], user_query: str) -> str:
    """
    整合所有community摘要,生成最终narrative
    """
    prompt = f"""
User Question: {user_query}

You have analyzed multiple event clusters related to this question:

{chr(10).join([
    f"Cluster {i+1}: {summary}"
    for i, summary in enumerate(community_summaries)
])}

Generate a comprehensive analysis:
1. Overview: What happened? (2-3 sentences)
2. Causal Chain: How events are connected? (4-5 key steps)
3. Attribution: Why did the outcome occur? (2-3 root causes)
4. Evidence: Which specific events support this? (3-5 key events with dates)

Structure your response as a financial analyst's report.
"""

    narrative = llm_call(prompt, model="gpt-4o")
    return narrative
```

**Token Efficiency Comparison:**

| Approach | Token Usage | Description |
|----------|-------------|-------------|
| Naive (全文) | 100 events × 2000 tokens = 200K | 不可行,超出context window |
| Title-only | 100 events × 20 tokens = 2K | 可行,但丢失因果细节 |
| Event Summaries | 100 events × 50 tokens = 5K | 较好,保留关键信息 |
| **Hierarchical (HCEG)** | **L1: 20 communities × 300 = 6K<br>L2: 1 narrative × 2K = 2K<br>Total: 8K** | **最佳平衡** |

### 3.3 Logic Chain Construction Algorithm

**核心思路: Temporal Causal Path Finding**

```python
def construct_logic_chain(
    G: nx.DiGraph,
    query_intent: str,
    max_chain_length: int = 10
) -> List[EventNode]:
    """
    在因果图中找到最相关的逻辑链

    算法:
    1. 找到与query最相关的起点events (vector search)
    2. 从起点开始,沿着causal edges做BFS/DFS
    3. 路径评分 = relevance × causality_confidence × temporal_coherence
    4. 返回top-k paths
    """
    # Step 1: 找起点
    query_embedding = voyage_embed(query_intent, input_type="query")
    start_candidates = [
        (event, cosine_similarity(event.embedding, query_embedding))
        for event in G.nodes()
    ]
    start_candidates.sort(key=lambda x: x[1], reverse=True)
    start_events = [e for e, score in start_candidates[:5]]

    # Step 2: 为每个起点找causal paths
    all_paths = []
    for start in start_events:
        paths = find_causal_paths(G, start, max_length=max_chain_length)
        all_paths.extend(paths)

    # Step 3: 路径评分
    scored_paths = []
    for path in all_paths:
        score = score_causal_path(path, query_embedding)
        scored_paths.append((path, score))

    scored_paths.sort(key=lambda x: x[1], reverse=True)

    # Step 4: 返回最佳路径
    best_path = scored_paths[0][0]
    return best_path


def find_causal_paths(G: nx.DiGraph, start: EventNode, max_length: int):
    """
    从start开始,沿着causal edges找所有路径
    """
    paths = []

    def dfs(node, current_path, visited):
        if len(current_path) >= max_length:
            paths.append(current_path[:])
            return

        # 找到所有outgoing causal edges
        successors = [
            (succ, G.edges[node.id, succ])
            for succ in G.successors(node.id)
            if G.edges[node.id, succ]['relation_type'] in ['causes', 'enables']
        ]

        if not successors:  # 叶节点
            paths.append(current_path[:])
            return

        # 按confidence排序,优先探索高confidence边
        successors.sort(key=lambda x: x[1]['confidence'], reverse=True)

        for succ_id, edge_data in successors:
            if succ_id not in visited:
                succ_node = G.nodes[succ_id]
                current_path.append((succ_node, edge_data))
                visited.add(succ_id)
                dfs(succ_node, current_path, visited)
                current_path.pop()
                visited.remove(succ_id)

    dfs(start, [(start, None)], {start.id})
    return paths


def score_causal_path(path: List[Tuple[EventNode, dict]], query_embedding: np.ndarray):
    """
    评分因子:
    1. Relevance: path中events与query的相关性
    2. Causality: edge confidence的平均值
    3. Temporal coherence: 时间跨度是否合理
    """
    events = [e for e, _ in path]
    edges = [edge for _, edge in path if edge is not None]

    # Relevance
    relevances = [
        cosine_similarity(e.embedding, query_embedding)
        for e in events
    ]
    avg_relevance = np.mean(relevances)

    # Causality
    confidences = [edge['confidence'] for edge in edges]
    avg_confidence = np.mean(confidences) if confidences else 0

    # Temporal coherence (惩罚跨度过大的路径)
    time_span = (events[-1].timestamp - events[0].timestamp).days
    temporal_score = 1 / (1 + time_span / 30)  # 30天内衰减较慢

    # 综合评分
    final_score = (
        0.5 * avg_relevance +
        0.3 * avg_confidence +
        0.2 * temporal_score
    )

    return final_score
```

### 3.4 Complete Workflow Example

**User Query:** "分析NVDA Q3收入超预期的原因"

**Step 1: Query Understanding**
```python
{
    "entity": "NVDA",
    "intent": "causal_attribution",
    "target_event": "Q3 revenue beat",
    "temporal_scope": "2024-07 to 2024-10",
    "required_event_types": ["earnings", "product_launch", "supply_chain", "partnership"]
}
```

**Step 2: Dual-Track Retrieval**
- Track 1: EODHD API fetch last 50 news about NVDA
- Track 2: Qdrant vector search with filters
- Total: ~100 relevant news articles

**Step 3: Event Extraction (并发处理)**
- 100 news → 150 events (some news contain multiple events)
- Store all in Qdrant with link deduplication

**Step 4: Causal Graph Construction**
- 150 events → Causal graph with 200+ edges
- Leiden clustering → 12 communities

**Step 5: Community Summarization**
```
Community 1 (Supply Chain):
TSMC ramped up CoWoS packaging capacity in July → enabled NVDA H100/H200 production increase → alleviated supply bottleneck

Community 2 (Product Launch):
NVDA announced Blackwell architecture in March → demand surge from cloud providers → created backlog

Community 3 (Market Demand):
Enterprise AI adoption accelerated in Q3 → Microsoft/Google increased orders → drove revenue growth

... (12 communities total)
```

**Step 6: Logic Chain Construction**
```
Best Causal Path (7 events):
1. [2024-07-15] TSMC completes advanced packaging expansion
   ↓ (enables, confidence=0.9)
2. [2024-08-01] NVDA H100 supply constraint eased
   ↓ (causes, confidence=0.85)
3. [2024-08-10] Cloud providers increase Q3 orders
   ↓ (causes, confidence=0.9)
4. [2024-08-28] NVDA Q3 revenue guidance raised
   ↓ (causes, confidence=0.95)
5. [2024-09-15] Enterprise AI spending accelerates
   ↓ (causes, confidence=0.8)
6. [2024-10-01] Data center revenue hits record
   ↓ (causes, confidence=0.92)
7. [2024-10-15] Q3 earnings beat consensus by 12%
```

**Step 7: Narrative Generation**
```markdown
# NVDA Q3收入超预期归因分析

## 核心结论
NVDA Q3收入超预期主要归因于供应链瓶颈缓解与企业AI需求激增的双重驱动。

## 因果逻辑链

### 1. 供应链突破 (2024年7月)
TSMC完成先进封装产能扩张,CoWoS产能提升40%,这直接解除了H100/H200芯片的供应瓶颈。

Evidence: [TSMC CoWoS Expansion Completed](link)

### 2. 供需平衡改善 (8月初)
供应约束缓解后,积压订单开始交付,云服务商(Microsoft, Google, AWS)大幅增加Q3订单。

Evidence: [Cloud Providers Increase NVDA Orders](link)

### 3. 需求侧催化 (9月中)
企业AI应用落地加速,推动数据中心支出增长,NVDA作为核心受益者获得超额订单。

Evidence: [Enterprise AI Spending Surge](link)

### 4. 财务表现 (10月)
综合作用下,Q3数据中心收入创历史新高,最终财报超出市场预期12%。

Evidence: [Q3 Earnings Report](link)

## 关键洞察
- **Root Cause #1**: TSMC产能扩张是supply-side关键解锁因素
- **Root Cause #2**: 企业AI落地是demand-side核心驱动力
- **Synergy**: 供需两端同步改善形成正反馈循环
```

**Token Usage Breakdown:**
- Event extraction: 150 events × 200 tokens = 30K (one-time, cached)
- Causality judgment: 30K tokens (one-time, cached in graph)
- Community summarization: 12 × 300 = 3.6K
- Final narrative: 2K
- **Total for end-user query: ~6K tokens** (vs naive 200K)

## 4. 实现路线图

### Phase 1: MVP (Week 1-2)
**Goal: 验证核心pipeline**

- [ ] EODHD API integration
- [ ] Voyage-context-3 embedding setup
- [ ] Qdrant collection schema design
- [ ] Basic event extraction (LLM-based)
- [ ] Link-based deduplication
- [ ] Simple vector search retrieval

**Deliverable:** 能从EODHD抓新闻并存入Qdrant,支持基本检索

### Phase 2: Causal Graph (Week 3-4)
**Goal: 构建因果关系网络**

- [ ] Event schema design (EventNode, CausalEdge)
- [ ] LLM causality judgment (batch processing)
- [ ] NetworkX graph construction
- [ ] Leiden community detection
- [ ] Basic path finding algorithm

**Deliverable:** 能构建因果图并找到简单逻辑链

### Phase 3: Hierarchical Summarization (Week 5-6)
**Goal: 实现token-efficient分析**

- [ ] Community-level summarization
- [ ] Global narrative generation
- [ ] Logic chain scoring algorithm
- [ ] Analysis Block integration

**Deliverable:** 端到端workflow,从query到structured analysis

### Phase 4: Optimization (Week 7-8)
**Goal: 提升准确性和性能**

- [ ] Causality judgment fine-tuning
- [ ] Multi-hop reasoning enhancement
- [ ] Caching strategy (event graph persistence)
- [ ] User feedback loop

**Deliverable:** Production-ready system

## 5. 技术选型

### 5.1 核心技术栈

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| News API | EODHD | 综合新闻源,支持symbol过滤 |
| Embedding | Voyage-context-3 / voyage-finance-2 | 金融domain优化,支持contextualized chunking |
| Vector DB | Qdrant | 开源,高性能,支持复杂filter |
| Graph | NetworkX | Python native,丰富算法库 |
| LLM (Event Extraction) | GPT-4o-mini | 便宜快速,结构化输出 |
| LLM (Causality) | GPT-4o | Reasoning能力强 |
| LLM (Summarization) | GPT-4o | 生成质量高 |

### 5.2 成本估算

**Scenario: 用户query "NVDA供应链分析"**

| Item | Cost |
|------|------|
| EODHD API (50 news fetch) | $0.001 |
| Voyage embedding (100 news, 50K tokens) | $0.006 |
| Event extraction (100 news, GPT-4o-mini) | $0.03 |
| Causality judgment (100 events, GPT-4o) | $0.30 |
| Summarization (GPT-4o) | $0.05 |
| **Total per analysis** | **~$0.40** |

**With Caching (subsequent queries):**
- Event graph已构建 → 跳过extraction和causality
- 只需summarization → **$0.05 per query**

### 5.3 可扩展性考虑

**数据规模:**
- 新闻条数: 10K/day (100 symbols × 100 news/symbol)
- Event nodes: ~50K
- Causal edges: ~100K
- Vector DB size: ~10GB

**查询性能:**
- Vector search: <100ms (Qdrant)
- Graph traversal: <200ms (NetworkX in-memory)
- LLM calls: 2-5s (并发)
- **Total latency: <10s** for complex analysis

## 6. 创新点与竞争优势

### 6.1 vs. Bloomberg Terminal
- ❌ Bloomberg: 展示新闻列表,用户自己阅读分析
- ✅ Fundley: **自动构建因果逻辑链**,生成structured insights

### 6.2 vs. ChatGPT + Web Search
- ❌ ChatGPT: 搜索top 10 results,context有限,无法deep dive
- ✅ Fundley: **专有新闻知识库** + **因果图谱**,支持多跳推理

### 6.3 vs. Traditional RAG
- ❌ RAG: 扁平检索,返回相关chunks
- ✅ Fundley: **Hierarchical Graph RAG**,理解事件关系,构建narrative

### 6.4 学术前沿对齐
- ✅ Graph RAG (Microsoft, 2024): Hierarchical summarization
- ✅ CAMEF (2025): Causal learning with counterfactual reasoning
- ✅ Voyage Context-3 (2025): Contextualized embeddings
- ✅ HiREC (2024): Evidence curation for token efficiency

## 7. 潜在风险与缓解策略

### 7.1 Causality Judgment Accuracy
**风险:** LLM可能误判因果关系(correlation vs causation)

**缓解:**
1. 使用temporal ordering作为hard constraint
2. 引入confidence score,低于阈值的边不使用
3. 支持人工feedback loop修正错误边
4. 未来: Fine-tune specialized causality model

### 7.2 Token Cost Control
**风险:** 复杂query可能触发大量LLM calls

**缓解:**
1. Event graph caching(一次构建,多次使用)
2. 智能batch processing
3. 用cheap model做初筛,good model做精细分析
4. 设置per-query token budget

### 7.3 Data Freshness vs Completeness
**风险:** 实时新闻vs历史知识库的trade-off

**缓解:**
1. Dual-track retrieval (API + Vector DB)
2. 增量更新策略: 每日新闻自动入库
3. TTL-based cache invalidation

### 7.4 Hallucination in Narrative
**风险:** LLM可能生成不存在的causal link

**缓解:**
1. 所有narrative必须grounded in events (with links)
2. Confidence score标注
3. 用户可以点击evidence验证

## 8. 评估指标

### 8.1 系统性能指标
- **Latency**: P95 < 10s
- **Token efficiency**: <10K tokens per query (vs naive 200K)
- **Cost per query**: <$0.50

### 8.2 质量指标
- **Event extraction accuracy**: >85% (human evaluation)
- **Causality precision**: >75% (expert annotation)
- **Narrative coherence**: >4/5 (user rating)

### 8.3 业务指标
- **User engagement**: Time spent on analysis blocks
- **Insight actionability**: 用户基于insights做出决策的比例

## 9. 未来演进方向

### 9.1 Multi-modal Integration (Phase 5)
- 整合财报数据(FMP)、股价时序(OHLCV)
- Event impact quantification: "供应链改善 → 股价+8%"
- 参考CAMEF的multimodal fusion方法

### 9.2 Counterfactual Reasoning (Phase 6)
- "如果TSMC产能扩张延迟,NVDA Q3收入会怎样?"
- 使用LLM生成counterfactual scenarios
- 参考CAMEF的counterfactual event augmentation

### 9.3 Real-time Event Monitoring (Phase 7)
- Streaming news ingestion
- 实时因果图更新
- Alert when critical causal path detected

### 9.4 Fine-tuned Causality Model (Phase 8)
- 收集人工标注的causality dataset
- Fine-tune specialized model (代替GPT-4o)
- 降低成本,提升准确性

## 10. 结论

本设计方案基于2024-2025年金融AI领域的前沿研究,提出了**Hierarchical Causal Event Graph (HCEG)**架构,能够:

1. ✅ **解决token爆炸问题**: 通过hierarchical summarization,将200K tokens压缩到<10K
2. ✅ **构建因果逻辑链**: 使用LLM + graph algorithms自动发现事件间的causal relationships
3. ✅ **支持深度归因分析**: 从"是什么"到"为什么",提供actionable insights
4. ✅ **成本可控**: ~$0.40/query,with caching降至$0.05
5. ✅ **学术前沿对齐**: 借鉴Graph RAG, CAMEF, Voyage Context-3等最新研究

**核心创新:**
- **不是简单的"title构建逻辑链"**: 使用full content做embedding和event extraction,保证准确性
- **不是"全文喂给LLM"**: 通过graph modularity和hierarchical summarization实现token efficiency
- **不是"传统摘要"**: Causal-aware summarization,保留因果关系细节

这是一个**工程可行且学术严谨**的方案,能够作为Fundley的核心竞争力之一。

---

**Author:** Claude (based on academic research synthesis)
**Date:** 2025-10-04
**Version:** 1.0
