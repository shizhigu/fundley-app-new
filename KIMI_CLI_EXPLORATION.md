# Kimi CLI Architecture Exploration Report

## Executive Summary

Kimi CLI is a sophisticated Python-based AI coding agent framework featuring a modular architecture with advanced concepts like context checkpointing, tool approval systems, context compaction, and time-travel messaging (D-Mail). The codebase demonstrates best practices in agent architecture design with extensive error handling, security boundaries, and extensibility patterns.

---

## 1. Overall Architecture

### 1.1 High-Level Design

Kimi CLI follows a **Soul-based architecture** where the main execution engine (`KimiSoul`) orchestrates:
- **LLM interaction** via the `kosong` framework
- **Tool execution** with dependency injection
- **Context management** with persistent session state
- **Event-driven async processing** with structured checkpointing

### 1.2 Core Layers

```
User Interface Layer (UI Modes)
    ↓
Agent Specification Layer (YAML-based agent configs)
    ↓
Soul/Execution Layer (KimiSoul + Context + Approval)
    ↓
Tool Execution Layer (Modular tool system)
    ↓
LLM Provider Layer (kosong chat providers)
```

### 1.3 Key Dependencies

- **kosong**: Custom LLM framework handling tool calling and streaming
- **pydantic**: Data validation for tool parameters
- **aiofiles**: Async file I/O
- **ripgrepy**: Wrapper around ripgrep for content searching
- **patch_ng**: Unified diff patch application
- **fastmcp**: Model Context Protocol client for external tools

---

## 2. Code Editing Tools Architecture

### 2.1 Tool Categories

Kimi provides **THREE different mechanisms** for code modification, each with specific use cases:

#### A. **WriteFile** - Full file creation/overwriting
- **Path**: `/src/kimi_cli/tools/file/write.py`
- **Use Case**: Creating new files or completely replacing content
- **Modes**: `overwrite` (default) or `append`
- **Key Feature**: Can be called multiple times with `append` mode for large files

```python
class Params(BaseModel):
    path: str  # Must be absolute path
    content: str
    mode: Literal["overwrite", "append"] = "overwrite"
```

**Safety Mechanisms**:
- Path validation (absolute paths only)
- Working directory boundary enforcement
- Parent directory existence check
- Approval system integration (requires user approval)

#### B. **StrReplaceFile** - Surgical string replacement
- **Path**: `/src/kimi_cli/tools/file/replace.py`
- **Use Case**: Making targeted edits to specific sections
- **Supports**: Multi-line strings, single or multiple edits in one call
- **Replace Modes**: Single occurrence (`replace_all: false`) or all occurrences (`replace_all: true`)

```python
class Edit(BaseModel):
    old: str  # Can be multi-line
    new: str  # Can be multi-line
    replace_all: bool = False

class Params(BaseModel):
    path: str
    edit: Edit | list[Edit]  # Single or batch edits
```

**Key Advantages**:
- Minimal context required (no need to read entire file)
- Multi-edit batching reduces round-trips
- Works excellently for isolated changes

**Verification**:
- Checks if any changes were actually made
- Returns error if old string not found

#### C. **PatchFile** - Unified diff patches
- **Path**: `/src/kimi_cli/tools/file/patch.py`
- **Use Case**: Complex multi-hunk changes with context preservation
- **Format**: Unified diff format (same as `git diff` or `diff -u`)
- **Purpose**: When changes are interdependent or require context

```python
class Params(BaseModel):
    path: str
    diff: str  # Unified diff format
```

**Advantages Over String Replace**:
- Better for coordinated multi-location changes
- Maintains context around edits (helps avoid conflicts)
- More resilient to exact whitespace matching
- Standard format compatible with `git` workflows

**Implementation Details**:
- Uses `patch_ng` library for application
- Creates patch object directly from string (no temp files)
- Validates hunk parsing and application
- Checks if content actually changed

---

## 3. Agent Prompts and Instructions

### 3.1 System Prompt Structure

**Location**: `/src/kimi_cli/agents/koder/system.md`

The system prompt is dynamically generated with template substitution:

```python
# From agent.py
system_prompt = string.Template(prompt_template).substitute(
    builtin_args._asdict(),  # ${KIMI_NOW}, ${KIMI_WORK_DIR}, etc.
    **spec_args  # Additional custom args
)
```

### 3.2 Builtin System Prompt Arguments

Automatically injected into all system prompts:

```python
class BuiltinSystemPromptArgs(NamedTuple):
    KIMI_NOW: str                # Current ISO timestamp
    KIMI_WORK_DIR: Path          # Working directory
    KIMI_WORK_DIR_LS: str        # `ls -la` output of work dir
    KIMI_AGENTS_MD: str          # Project's AGENTS.md content
```

**Usage in Prompts**:
```markdown
The current working directory is `${KIMI_WORK_DIR}`.
The current date and time is `${KIMI_NOW}`.

## Project Information

${KIMI_AGENTS_MD}
```

### 3.3 Key Instruction Patterns

From `/src/kimi_cli/agents/koder/system.md`:

1. **Parallel Tool Execution**:
   > "You have the capability to output any number of tool calls in a single response. If you anticipate making multiple non-interfering tool calls, you are HIGHLY RECOMMENDED to make them in parallel."

2. **Tool Transparency**:
   > "When calling tools, do not provide explanations because the tool calls themselves should be self-explanatory."

3. **Language Matching**:
   > "When responding to the user, you MUST use the SAME language as the user, unless explicitly instructed to do otherwise."

4. **Codebase Understanding**:
   > "When working on existing codebase, you should: Understand the codebase and the user's requirements. Identify the ultimate goal and the most important criteria. Make MINIMAL changes to achieve the goal."

5. **Error Recovery**:
   > "The results of the tool calls will be returned to you in a `tool` message. You must decide on your next action based on the tool call results."

### 3.4 Context Compaction Prompt

**Location**: `/src/kimi_cli/prompts/compact.md`

Special prompt for compressing conversation history:

**Compression Priorities** (in order):
1. Current Task State
2. Errors & Solutions
3. Code Evolution (final versions only)
4. System Context
5. Design Decisions
6. TODO Items

**Required Output Structure**:
```markdown
<current_focus>
[What we're working on now]
</current_focus>

<environment>
- [Key setup/config points]
</environment>

<completed_tasks>
- [Task]: [Brief outcome]
</completed_tasks>

<active_issues>
- [Issue]: [Status/Next steps]
</active_issues>

<code_state>
<file>
[filename]
**Summary:** [What this code does]
**Key elements:** [Important functions/classes]
**Latest version:** [Critical code snippets]
</file>
</code_state>
```

---

## 4. Tool System Architecture

### 4.1 Tool Definition Pattern

All tools extend `CallableTool2[Params]` with Pydantic models:

```python
class Params(BaseModel):
    param_name: str = Field(description="Human-readable description")

class MyTool(CallableTool2[Params]):
    name: str = "MyTool"
    description: str = (Path(__file__).parent / "my_tool.md").read_text()
    params: type[Params] = Params
    
    def __init__(self, dependency: SomeDependency, **kwargs):
        super().__init__(**kwargs)
        self._dependency = dependency
    
    async def __call__(self, params: Params) -> ToolReturnType:
        # Implementation
        return ToolOk(output="...", message="...")
        # or
        return ToolError(message="...", brief="...")
```

### 4.2 Available Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **ReadFile** | Read file contents | Limits: 1000 lines, 2000 chars/line, 100KB total |
| **WriteFile** | Create/overwrite files | Supports append mode |
| **StrReplaceFile** | String replacement | Supports multi-line, batch edits |
| **PatchFile** | Apply unified diffs | For complex coordinated changes |
| **Glob** | File pattern matching | Prevents unsafe `**` patterns |
| **Grep** | Regex content search | Uses ripgrep, supports multiline |
| **Bash** | Shell command execution | 5-minute timeout, requires approval |
| **Task** | Delegate to subagents | Creates isolated contexts |
| **Think** | Internal reasoning | No-op tool for explicit thinking |
| **SetTodoList** | Task management | Tracks status (Pending/In Progress/Done) |
| **SearchWeb** | Web search | Via Moonshot Search API |
| **FetchURL** | Download content | HTTP GET requests |
| **SendDMail** | Time-travel messaging | Send messages to past checkpoints |

### 4.3 Tool Dependency Injection

**Location**: `/src/kimi_cli/soul/agent.py`, `_load_tool()` function

Tools declare dependencies via positional parameters:

```python
def _load_tool(tool_path: str, dependencies: dict[type, Any]) -> Tool | None:
    # Parse "module:ClassName"
    module_name, class_name = tool_path.rsplit(":", 1)
    module = importlib.import_module(module_name)
    cls = getattr(module, class_name)
    
    # Inject positional parameters matching dependency types
    args = []
    for param in inspect.signature(cls).parameters.values():
        if param.kind == inspect.Parameter.KEYWORD_ONLY:
            break  # Stop at keyword-only params
        if param.annotation not in dependencies:
            raise ValueError(f"Dependency not found: {param.annotation}")
        args.append(dependencies[param.annotation])
    
    return cls(*args)
```

**Example**: `WriteFile` declares:
```python
def __init__(self, builtin_args: BuiltinSystemPromptArgs, approval: Approval, **kwargs):
```

Injected dependencies: `BuiltinSystemPromptArgs`, `Approval`

### 4.4 Tool Descriptions

Tool descriptions are loaded from markdown files with optional substitution:

```python
def load_desc(path: Path, substitutions: dict[str, str] | None = None) -> str:
    description = path.read_text(encoding="utf-8")
    if substitutions:
        description = string.Template(description).substitute(substitutions)
    return description
```

Example from `read.md`:
```
Read a file from the working directory.

**Limits:**
- Maximum $MAX_LINES lines (default read)
- Maximum $MAX_LINE_LENGTH characters per line
- Maximum $MAX_BYTES total bytes
```

---

## 5. Error Prevention and Validation Mechanisms

### 5.1 Multi-Layer Validation Strategy

#### Layer 1: Pydantic Parameter Validation
```python
class Params(BaseModel):
    timeout: int = Field(
        description="Timeout in seconds",
        ge=1,           # >= 1
        le=MAX_TIMEOUT  # <= 300
    )
```

#### Layer 2: Path Security Validation
All file tools validate paths:

```python
def _validate_path(self, path: Path) -> ToolError | None:
    # 1. Must be absolute path
    if not path.is_absolute():
        return ToolError("Not an absolute path")
    
    # 2. Must be within work directory (prevent traversal)
    resolved_path = path.resolve()
    resolved_work_dir = self._work_dir.resolve()
    if not str(resolved_path).startswith(str(resolved_work_dir)):
        return ToolError("Path outside working directory")
    
    return None
```

#### Layer 3: State Validation
Files check if they exist/don't exist as appropriate:

```python
# WriteFile: Parent must exist
if not p.parent.exists():
    return ToolError("Parent directory does not exist")

# PatchFile: File must exist
if not p.exists():
    return ToolError("File does not exist")

# StrReplaceFile: Verify changes were made
if content == original_content:
    return ToolError("No replacements were made")
```

#### Layer 4: Approval System
Critical operations require user approval:

```python
async def request(self, sender: str, action: str, description: str) -> bool:
    """Request approval. Returns False if rejected."""
    if self._yolo:  # Auto-approve mode
        return True
    
    if action in self._auto_approve_actions:  # Session-wide approval
        return True
    
    request = ApprovalRequest(tool_call.id, sender, action, description)
    await request.wait()  # Block until user responds
```

Used by `WriteFile`, `StrReplaceFile`, `PatchFile`, `Bash`, `Glob`, `Grep`, etc.

### 5.2 Output Limits and Truncation

**Location**: `/src/kimi_cli/tools/utils.py`, `ToolResultBuilder` class

Prevents unbounded output from overwhelming context:

```python
class ToolResultBuilder:
    DEFAULT_MAX_CHARS = 50_000
    DEFAULT_MAX_LINE_LENGTH = 2000
    
    def write(self, text: str) -> int:
        """Write text, respecting limits"""
        for line in text.splitlines(keepends=True):
            if self.is_full:
                break
            
            # Truncate long lines
            line = truncate_line(line, self.max_line_length)
            self._buffer.append(line)
            self._n_chars += len(line)
```

Returns messages indicating truncation happened.

### 5.3 Error Handling Patterns

**Three Error Types**:

1. **ToolOk**: Success
   ```python
   return ToolOk(
       output="file contents...",
       message="File successfully read. 150 lines from file.",
       brief="File read"  # Optional short message
   )
   ```

2. **ToolError**: Operation failed
   ```python
   return ToolError(
       output="partial output",
       message="Detailed error message for LLM",
       brief="Concise error for UI"
   )
   ```

3. **ToolRejectedError**: User rejected approval
   ```python
   return ToolRejectedError()
   # Pre-defined message: "Tool call rejected by user"
   ```

---

## 6. Context Management and Checkpointing

### 6.1 Persistent Context Storage

**Location**: `/src/kimi_cli/soul/context.py`

Context is stored in JSONL format with embedded metadata:

```jsonl
{"role": "user", "content": "Hello"}
{"role": "assistant", "content": [...]}
{"role": "_checkpoint", "id": 0}
{"role": "_usage", "token_count": 12345}
```

**Key Methods**:

```python
class Context:
    async def checkpoint(self, add_user_message: bool):
        """Create numbered checkpoint (0, 1, 2, ...)"""
        await f.write({"role": "_checkpoint", "id": checkpoint_id})
    
    async def revert_to(self, checkpoint_id: int):
        """Restore to checkpoint, discarding everything after"""
        # Rotates old file, recreates from rotated copy
    
    async def append_message(self, message: Message | Sequence[Message]):
        """Add messages to history"""
    
    async def update_token_count(self, token_count: int):
        """Track LLM token usage"""
```

### 6.2 Checkpointing Strategy

Checkpoints are created at strategic points:

1. **Before each agent step**: Allows rewinding if needed
2. **During D-Mail delivery**: Can jump to past checkpoint
3. **After context compaction**: Marks compressed state

### 6.3 Context Compaction

**Location**: `/src/kimi_cli/soul/compaction.py`

When context exceeds 80% of max (with 50K reserved tokens):

```python
class SimpleCompaction(Compaction):
    MAX_PRESERVED_MESSAGES = 2  # Keep last 2 messages
    
    async def compact(self, messages: Sequence[Message], llm: LLM):
        # 1. Identify messages to preserve (last 2)
        # 2. Compact everything before them using LLM
        # 3. Return: [compacted_summary, ...preserved_messages]
```

Uses the `compact.md` prompt to summarize conversation.

### 6.4 Token Tracking

Token count is updated after each LLM step:

```python
# From KimiSoul._step()
result = await kosong.step(...)
if result.usage is not None:
    await self._context.update_token_count(result.usage.input)
```

Context usage percentage: `context.token_count / llm.max_context_size`

---

## 7. Special Mechanisms

### 7.1 D-Mail System (Time-Travel Messaging)

**Location**: `/src/kimi_cli/soul/denwarenji.py`

Allows sending messages to past checkpoints:

```python
class DMail(BaseModel):
    message: str              # Message content
    checkpoint_id: int        # Target checkpoint (0-based)

# In agent loop:
if dmail := self._denwa_renji.fetch_pending_dmail():
    # 1. Revert context to checkpoint
    await self._context.revert_to(dmail.checkpoint_id)
    
    # 2. Inject system message with D-Mail content
    await self._context.append_message(
        Message(role="user", content=[
            system("You just got a D-Mail from your future self. ...")
            + dmail.message
        ])
    )
    
    # 3. Continue from past point
    raise BackToTheFuture(dmail.checkpoint_id, messages)
```

### 7.2 Approval System

**Location**: `/src/kimi_cli/soul/approval.py`

Async approval flow:

```python
class Approval:
    async def request(self, sender: str, action: str, description: str) -> bool:
        # Block tool execution until user approves
        request = ApprovalRequest(tool_call.id, sender, action, description)
        self._request_queue.put_nowait(request)
        response = await request.wait()
        
        if response == ApprovalResponse.APPROVE_FOR_SESSION:
            self._auto_approve_actions.add(action)  # Auto-approve future calls
```

Approval options:
- `APPROVE`: One-time approval
- `APPROVE_FOR_SESSION`: Auto-approve future same-action calls
- `REJECT`: Block tool execution

---

## 8. Anti-Hallucination and Error Prevention

### 8.1 Mechanisms Preventing Hallucination

1. **Explicit Tool Errors**: Rather than continuing with incorrect data, tools return `ToolError` which the LLM sees as tool failure, not silent success.

2. **Validation at Every Layer**:
   - Pydantic validates input types
   - Path validation prevents directory traversal
   - File existence checks prevent operations on non-existent files
   - Content verification ensures edits actually applied

3. **Output Limits**: Prevents the LLM from processing massive, potentially corrupted outputs that could cause reasoning errors.

4. **Atomic Operations**: 
   - File reads are bounded (max lines/bytes)
   - StrReplaceFile returns error if old string not found
   - PatchFile validates hunk count before applying

5. **Error Details**: Tools return both detailed messages (for LLM reasoning) and brief summaries (for UI), helping the LLM understand what went wrong.

### 8.2 Verification Patterns

From `StrReplaceFile`:
```python
original_content = content
# ... apply edits ...

# Check if any changes were made
if content == original_content:
    return ToolError(
        message="No replacements were made. The old string was not found.",
        brief="No replacements made"
    )
```

From `PatchFile`:
```python
# Verify patch parsed correctly
if not patch_set or patch_set is True:
    return ToolError("Failed to parse diff content")

# Verify hunks exist
if total_hunks == 0:
    return ToolError("No valid hunks found")

# Verify patch applied successfully
if not patch_set.apply(root=str(p.parent)):
    return ToolError("Patch application failed")

# Verify content actually changed
if modified_content == original_content:
    return ToolError("No changes were made")
```

---

## 9. Tool Configuration

### 9.1 Agent Specification (YAML)

**Location**: `/src/kimi_cli/agents/koder/agent.yaml`

```yaml
version: 1
agent:
  name: ""  # Overridden at runtime
  system_prompt_path: ./system.md
  system_prompt_args:
    ROLE_ADDITIONAL: ""
  tools:
    - "kimi_cli.tools.task:Task"
    - "kimi_cli.tools.think:Think"
    - "kimi_cli.tools.bash:Bash"
    - "kimi_cli.tools.file:ReadFile"
    - "kimi_cli.tools.file:WriteFile"
    - "kimi_cli.tools.file:StrReplaceFile"
    # - "kimi_cli.tools.file:PatchFile"  # Commented out
  subagents:
    koder:
      path: ./sub.yaml
      description: "Good at general software engineering tasks."
```

### 9.2 Agent Specification Inheritance

```python
# Can extend base agent
extend: "default"  # or path to another agent.yaml

# Can exclude specific tools
exclude_tools:
    - "kimi_cli.tools.bash:Bash"
```

### 9.3 Subagent System

Subagents run in isolated contexts:

```python
# From Task tool
async def _run_subagent(self, agent: Agent, prompt: str):
    subagent_history_file = await self._get_subagent_history_file()
    context = Context(file_backend=subagent_history_file)
    soul = KimiSoul(agent, context=context, ...)
    
    await run_soul(soul, prompt, _ui_loop_fn, asyncio.Event())
    
    # Extract final response
    final_response = message_extract_text(context.history[-1])
    return ToolOk(output=final_response)
```

Subagents:
- Cannot see parent agent's context
- Run in their own history file
- Can recursively call Task tool
- Have access to same tools as parent

---

## 10. Best Practices and Patterns

### 10.1 Code Editing Best Practices

From system.md:
> "When working on existing codebase, make MINIMAL changes to achieve the goal. Make minimal changes to avoid unintended side effects."

**Editing Strategy**:
1. **For isolated changes** → Use `StrReplaceFile` (low context overhead)
2. **For coordinated multi-location changes** → Use `PatchFile` (maintains context)
3. **For new files** → Use `WriteFile`

### 10.2 File Reading Patterns

`ReadFile` enforces limits to prevent context explosion:

```python
# From read.py
MAX_LINES = 1000
MAX_LINE_LENGTH = 2000
MAX_BYTES = 100 << 10  # 100KB

# When limit reached, tool returns message:
# "Max 1000 lines reached."
# "Max 100 KB reached."
# "End of file reached."
```

Use `line_offset` and `n_lines` for large files:
```
ReadFile(path="/large/file.py", line_offset=1001, n_lines=1000)
```

### 10.3 Glob Pattern Safety

From `Glob` tool:
```python
async def _validate_pattern(self, pattern: str) -> ToolError | None:
    if pattern.startswith("**"):
        # Give friendly error with directory listing
        return ToolError(
            output=ls_result,
            message="Pattern starts with '**' is not allowed. "
                   "This would recursively search all directories..."
        )
```

Prevents accidentally searching `node_modules` or other huge directories.

### 10.4 Bash Command Execution

```python
# Has approval requirement
await self._approval.request(
    self.name,
    "run shell command",
    f"Run command `{params.command}`"
)

# Has timeout (default 60s, max 300s)
exitcode = await _stream_subprocess(
    params.command, stdout_cb, stderr_cb, params.timeout
)

# Streams output to avoid buffering large outputs
def stdout_cb(line: bytes):
    builder.write(line.decode(errors="replace"))
```

---

## 11. Testing Strategy

### 11.1 Test Structure

Tests are in `/tests/` following pattern `test_*.py`:

- `test_default_agent.py` - Full agent integration tests
- `test_bash.py` - Bash tool tests
- `test_glob.py` - Glob tool tests
- `test_grep.py` - Grep tool tests
- `test_patch_file.py` - Patch application tests
- `test_load_agent.py` - Agent loading tests

### 11.2 Test Fixtures

From `conftest.py`:

```python
@pytest.fixture
async def agent(tmp_path, llm_provider):
    """Load default agent for testing"""
    return await load_agent_with_mcp(...)

@pytest.fixture
async def soul(agent, tmp_path):
    """Create KimiSoul instance"""
    return KimiSoul(agent, context=Context(...), ...)
```

### 11.3 Approval Mocking

```python
@pytest.fixture
def approval():
    approval = Approval(yolo=True)  # Auto-approve all
    return approval
```

---

## 12. Key Architectural Insights

### 12.1 Why Multiple Edit Tools?

1. **WriteFile**: Simplest for new content, but requires full content
2. **StrReplaceFile**: Best for isolated changes (e.g., "fix function signature"), minimal context
3. **PatchFile**: Best for complex coordinated changes where context matters (e.g., "refactor module"), uses standard format

### 12.2 Why Checkpointing?

1. **Enables recovery**: If D-Mail arrives, can revert to past state
2. **Enables compaction**: Can mark compacted state as checkpoint
3. **Enables rollback**: Can undo failed operations
4. **Enables debugging**: Can see what happened at each step

### 12.3 Why Approval System?

1. **Safety first**: User sees what agent plans before execution
2. **Session learning**: Can approve action once for session
3. **Non-blocking**: Uses async queue so doesn't halt agent
4. **Extensible**: Different approval policies via `yolo` mode or subclassing

### 12.4 Why Output Limits?

Prevents:
- Context explosion from huge file reads
- Token waste on verbose tool outputs
- Unreliable LLM behavior with massive prompts
- Malformed data causing LLM reasoning errors

---

## 13. Patterns to Apply to Our System

### 13.1 Path Security Validation
```python
def _validate_path(self, path: Path) -> ToolError | None:
    if not str(path.resolve()).startswith(str(self._work_dir.resolve())):
        return ToolError("Path outside working directory")
```

### 13.2 Output Result Builder
```python
builder = ToolResultBuilder(max_chars=50_000, max_line_length=2000)
for line in output:
    builder.write(line)
return builder.ok("Operation succeeded")
```

### 13.3 Tool Verification Pattern
```python
# Read original
original = await f.read()

# Perform operation
# ...

# Verify change was made
if result == original:
    return ToolError("No changes were made")
```

### 13.4 Pydantic with Field Constraints
```python
class Params(BaseModel):
    timeout: int = Field(
        description="...",
        default=60,
        ge=1,  # >= 1
        le=300  # <= 300
    )
```

### 13.5 Approval System Pattern
```python
if not await self._approval.request(self.name, action, description):
    return ToolRejectedError()
```

### 13.6 Tool Description Loading
```python
description: str = (Path(__file__).parent / "tool_name.md").read_text()
```

---

## 14. Conclusion

Kimi CLI demonstrates sophisticated agent architecture with:

1. **Modular tool system** with dependency injection
2. **Multiple code editing mechanisms** for different scenarios
3. **Comprehensive error handling** at multiple layers
4. **Context management** with checkpointing and compaction
5. **Security boundaries** preventing directory traversal
6. **Approval system** for user control
7. **Anti-hallucination patterns** through verification and validation
8. **Extensibility** through YAML configs, subagents, and MCP

The architecture prioritizes **safety, correctness, and user control** while maintaining flexibility for complex AI-assisted coding tasks.
