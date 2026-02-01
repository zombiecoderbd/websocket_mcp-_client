**AI System Architecture: Operational Blueprint**

This document outlines the core components, purpose, and essential operational views for a robust, production-ready AI system. The system is designed to be a "Developer AI" with deep local and cloud integration, focusing on transparency, control, and explainability.-----**1️⃣ Dashboard: The Command and Control Tower (সব কিছুর কন্ট্রোল টাওয়ার)**

The Dashboard is the operational heart, providing immediate, high-level visibility into the system's health and performance.

| Category | Essential Views (Data Points) | Operational Insight |
| ----- | ----- | ----- |
| **System Health** | CPU/RAM Utilization (Overall & Per Process), Active Model Count, Active Agent Count, Global Error Rate (Last 5/15/60 min), System Uptime, Local Storage Health. | **Liveness Check:** Confirms the system is operational and identifies resource bottlenecks or failing components instantly. |
| **Traffic Snapshot** | Requests Per Minute (RPM), Top 3 Most Used Models (Local/Cloud), Local vs. Cloud Request Ratio, Average Latency (P50, P90). | **Load Balancing Validation:** Verifies traffic distribution efficiency and highlights models/providers under heavy load. |
| **Alerts & Warnings** | Model Timeout/Crash Events, Agent Process Failures (Crash/Exit Codes), Proxy Authentication Failures, Cloud Quota Warnings, High-Priority Error Logs. | **Production Feel:** Focuses attention on immediate issues requiring administrative intervention, ensuring high availability. |
| **Core Logic** | The Dashboard’s design is modeled after industry-standard observability platforms (e.g., Cursor, OpenAI's internal monitoring), prioritizing **signal over noise**. |  |

\-----**2️⃣ Models: The Unified View (সব মডেলের unified view)**

This section provides a consolidated management and observability layer for all LLMs, regardless of deployment location (Local or Cloud).**Core Model Fields (Universal)**

| Field | Description |
| ----- | ----- |
| **Model Name** | Unique identifier (e.g., `llama3-8b`, `gemini-2.5-pro`). |
| **Provider** | Source of the model (e.g., `ollama`, `llama.cpp`, `google`, `openai`, `azure`). |
| **Status** | Current operational state (`running`, `stopped`, `initializing`, `error`). |
| **Avg/P95 Latency** | Average and 95th percentile response time (Crucial for user experience). |
| **Total Requests Count** | Lifetime request count for usage tracking and billing. |
| **Last Response Time** | Timestamp of the last successful interaction (Liveness confirmation). |

**Local Model Extensions (Ollama / llama.cpp)**

| Field | Description |
| ----- | ----- |
| **Process ID (PID)** | Operating system identifier for direct process control. |
| **Resource Usage** | Real-time CPU/RAM consumption (for performance tuning). |
| **Startup Time** | Time taken from command to ready state. |
| **CLI Control** | Dedicated buttons/API endpoints for `start`, `stop`, `restart`, `reload`. |
| **Installation/Verification** | Status showing model file integrity and successful loading. |
| **Binding** | Direct link to the associated **CLI Agent** controlling the process. |

**Cloud Model Extensions**

| Field | Description |
| ----- | ----- |
| **API Health Status** | Real-time status check of the cloud provider's API endpoint (e.g., `200 OK`). |
| **Quota Usage / Limit** | Percentage of daily/monthly API quota consumed. |
| **Cost Estimate** | Real-time or projected cost based on token usage (Optional, but highly recommended). |
| **Region / Endpoint** | Geographical deployment region and API endpoint URL. |
| **Fail Count** | Number of failed/retried requests. |
| **Trust Layer** | Validation of Cloud Provider trust and configuration. |

**🧪 Testing Section (VERY IMPORTANT)**

| Component | Purpose & Views |
| ----- | ----- |
| **Per-Model Test Utility** | A mandatory UI element for every model view. Allows running a standard or custom test prompt to validate output quality, latency, and token consumption *before* an Agent uses it. |
| **Test Output** | Includes: **Response Preview**, **Observed Latency**, **Token Count (Input/Output)**, **Success/Failure Status**. |
| **Debugging** | **Agent Debugging is IMPOSSIBLE without this feature.** It isolates model failure from agent logic failure. |

\-----**3️⃣ Ollama Models: Local AI Factory (লোকাল AI ফ্যাক্টরি)**

A specialized view for managing locally installed and self-hosted models, emphasizing control and privacy.

| View/Field | Purpose |
| ----- | ----- |
| **Installed Models List** | Full inventory of all local model files. |
| **Download Status** | Real-time progress bar and status for ongoing model downloads. |
| **Version / Hash** | File version and cryptographic hash for integrity check. |
| **Embedding Support** | Flag indicating if the model can generate embeddings (Crucial for RAG/Memory). |
| **Verify Button** | Triggers a file integrity and basic inference test. |
| **Core Logic** | This page acts as the **production wrapper** and GUI for a headless local LLM engine like Ollama, providing necessary administration features. |

\-----**4️⃣ Agents: The System's True Brain (System-এর আসল মস্তিষ্ক)**

Agents are the orchestrators, transforming model output (talk) into system actions (work).**Agent List View**

| Field | Description |
| ----- | ----- |
| **Agent Name** | Unique identifier (e.g., `Code-Fixer-V2`). |
| **Type** | Classification (e.g., `chat`, `code-generation`, `debugging`, `admin-tasks`). |
| **Connected Model** | Which LLM is currently being used by this agent. |
| **Tools Enabled** | List of activated tools (e.g., `Terminal`, `Editor-Write`, `File-Read`). |
| **Memory Usage** | Amount of active memory (tokens/embeddings) currently loaded. |
| **Status** | Current operational state (`idle`, `working`, `error`, `paused`). |

**Agent Detail View: Configuration**

| Section | Views / Configuration Items | Dependency Graph |
| ----- | ----- | ----- |
| **Persona** | **Role** (e.g., `Senior Developer`), **Language** (e.g., `Bangla`, `English`), **Tone** (e.g., `Concise`, `Formal`), **System Prompt**. |  |
| **Tools** | Toggle and configure enabled tools: `Chat`, `Editor`, `File System`, `Terminal`, `MCP-Access`, `Web-Search`. | **Tool Dependency Graph:** Visual representation showing which tools depend on others, and which tools are blocking (e.g., `Terminal` is blocked if `Sandbox` is disabled). |
| **Integrations** | Linked external services: **Editor** (`VS Code` / `Web-IDE`), **CLI Access**, **Cloud Models Allowed**. |  |

**Agent Follow Logic (Explainability)**

| Component | Purpose |
| ----- | ----- |
| **Request Trace** | Tracks the origin of the request (e.g., `VS Code Extension -> File-X`). |
| **Tool Execution Log** | Chronological log of which tools were invoked, with input parameters and return values. |
| **Final Output/Action** | The ultimate action taken (e.g., `applied 4 lines of diff to file-Y`). |
| **Core Logic** | This is the **explainability layer**. An agent without this visibility is a **black box ❌**. |

\-----**5️⃣ Servers: Infrastructure Truth (Infrastructure truth)**

Mandatory for any distributed or local-cloud hybrid system.

| Field | Description |
| ----- | ----- |
| **Server ID / Name** | Unique hostname or identifier. |
| **Role** | Function of the server (e.g., `proxy`, `mcp-instance`, `ollama-host`, `model-worker`). |
| **IP / Tunnel Endpoint** | Network address and tunnel status (if applicable). |
| **Region / Zone** | Geographic location. |
| **Status** | Health check status (`online`, `degraded`, `offline`). |
| **Load** | Key load metric (e.g., average CPU load, request queue depth). |
| **Core Logic** | In a distributed system, **server visibility is mandatory** for reliable operation. |

\-----**6️⃣ Memory: AI's Historical Context (AI-এর স্মৃতি)**

The layer that grants the agent temporal awareness and personalization.**Memory Types View**

| Memory Type | Essential Views / Controls | Operational Control |
| ----- | ----- | ----- |
| **Conversation Memory** | Recent chat history, associated agent, token count, **Clear History** option. | Ensures context is maintained per session. |
| **Agent Memory** | Configurable persona data, learned tool preferences, system knowledge (e.g., preferred programming language). | Persistence of agent identity and skill. |
| **Embedding Memory** | Total vector count, embedding model used, **Rebuild Index** button, latency on vector search. | Manages the RAG (Retrieval-Augmented Generation) source. |
| **Notes / Decisions** | Timestamped Markdown view of agent-made critical decisions or internal notes. | Long-term learning and persistence layer. |
| **Core Logic** | Memory visibility is crucial for **detecting and diagnosing hallucination** and context drift. |  |

\-----**7️⃣ Load Balancer: Stability Controller**

Ensures system resilience against model or provider failures.

| View/Field | Purpose |
| ----- | ----- |
| **Routing Rules** | List of defined rules (e.g., `code-agent -> local-ollama, fallback -> google-cloud`). |
| **Active Targets** | List of currently healthy models/servers available for routing. |
| **Failover Count** | Metric tracking how many requests have been automatically rerouted due to failure. |
| **Avg Latency Per Route** | Latency breakdown for each target to inform routing decisions. |
| **Core Logic** | **Stability \> Raw Speed.** Load balancing ensures the system remains operational even if components fail. |

\-----**8️⃣ Prompt Templates: Agent's Language Protocol (সব agent-এর ভাষা)**

Centralized management for system and user prompts to ensure consistency and control.

| View/Field | Purpose |
| ----- | ----- |
| **Template Name** | Descriptive identifier (e.g., `Code-Fix-System-v1`, `Bangla-Chat-User`). |
| **Used By Agents** | List of all agents currently utilizing the template. |
| **Variables** | Defined placeholders in the template (e.g., `{{file_content}}`, `{{user_query}}`). |
| **Language** | Specification of the prompt language (`Bangla`/`English`/`Mixed`). |
| **Version History** | Log of all changes to the template with rollback capability. |
| **Core Logic** | **Prompt \= Code.** Without version control, debugging agent behavior is impossible. |

\-----**Extended Operational Components**

These components govern system interactions with the local environment and external services.**1️⃣ CLI Agent: Local System's Hands and Feet (লোকাল সিস্টেমের হাত–পা)**

The command-line interface layer for root-level control and low-level task execution.**Must-have Views (Admin)**

| Section | Views / Controls | Operational Value |
| ----- | ----- | ----- |
| **Running Processes** | Process Name, PID, Bound Model, Real-time CPU/RAM, Uptime. | Direct observability into local model processes. |
| **Controls** | **Start, Stop, Restart, Kill (Danger Zone)** buttons/API endpoints. | Complete lifecycle management for local services. |
| **Logs** | Streamed **stdout, stderr**, and **exit code** reporting. | **Crucial for Model Failure Diagnosis:** Explains *why* a model process exited. |
| **Protocol** | **stdio (Leader Choice)** protocol for communication (CLI ↔ MCP ↔ Proxy). | Standard, trusted, lowest-level communication. |

**2️⃣ Editor Integration: AI's Workplace (AI বাস্তবে কাজ করে এখানে)**

The interface that allows the AI to perform complex, developer-focused tasks within an IDE.**Editor Capability Matrix**

| Capability | Views / Functions |
| ----- | ----- |
| **File Control** | `read/write`, `diff apply (patch) tool`, `create/delete` file/directory. |
| **Cursor Control** | `insert at cursor`, `multi-range edit (selection handling)`. |
| **Diagnostics** | Injecting/Reading standard IDE **errors, warnings, and suggestions**. |

**Protocols (Important)**

| Layer | Protocol | Purpose |
| ----- | ----- | ----- |
| Editor ↔ Extension | VS Code API / Native Extension API | Direct IDE interaction. |
| Extension ↔ MCP | HTTPS / JSON-RPC | Reliable, secure communication with the backend. |
| Streaming | Server-Sent Events (SSE) / WebSockets | Real-time token and log streaming. |
| Local Tools | stdio (via CLI Agent) | Lowest-latency local execution. |

**LSP / DAP Hooks (Minimal but Correct)**

The system must integrate the *hooks* for the Language Server Protocol (LSP) and Debug Adapter Protocol (DAP), focusing on integration points rather than full feature parity.

| Protocol | Minimal Required Hooks |
| ----- | ----- |
| **LSP** | `diagnostics`, `document symbols`, `hover information`. |
| **DAP** | `launch/attach`, `set/hit breakpoints`, `read variables/call stack`. |

**7️⃣ MCP (Model Control Plane): The Single Source of Truth (⭐ সবচেয়ে গুরুত্বপূর্ণ)**

The central nervous system, mediating all internal and external communication and logic.**MCP Core Rules (The Rules of Stability)**

1. **Rule 1: Editor-Agnostic:** Must handle requests identically from VS Code, Web Editor, Mobile, or CLI. All clients speak one unified language.  
2. **Rule 2: Stateless Core:** The MCP should not hold conversational state. It only manages **memory references** (`memory_refs`) and routing logic.  
3. **Rule 3: Metadata Always:** Every request and response must carry a comprehensive metadata header.

**MCP Request Header (MANDATORY)**

The header provides the complete context for decision-making:  
{  
  "agent\_id": "code-agent-1",  
  "persona": "bangla-dev",  
  "editor": "vscode",  
  "tools": \["file", "terminal", "memory-read"\],  
  "conversation\_id": "xyz-12345",  
  "memory\_refs": \["emb:123", "note:45"\],  
  "trace\_id": "t-8765"   
}  
**MCP Response Pattern (Traceable Action)**

Responses instruct the client on the next precise action:  
{  
  "action": "apply\_diff" | "show\_message" | "run\_terminal\_command",  
  "confidence": 0.82,  
  "used\_tools": \["file"\],  
  "output": { /\* Action-specific payload (e.g., diff content, message text) \*/ },  
  "next\_hint": "run tests" | "ask user for clarification"  
}  
**Core Logic**

The MCP structure ensures: **Traceability, Explainability, and Debuggability** across the entire system.-----**End-to-End Logical Flow: Operational Proof (প্রমাণ)**

This validates the complete path of a request through the system.

1. **Editor** (VS Code)  
2. **Extension** (VS Code API)  
3. **MCP** (HTTPS / JSON-RPC)  
4. **Proxy / Load Balancer** (Route decision based on Load/Latency)  
5. **Model** (Inference)  
6. **Agent** (Logic/Tool Use)  
7. **Editor Action** (Response, e.g., applying a patch or showing a message)

**Critical Check:** Every step in this flow must be **observable**, **testable**, and **replaceable**.-----**✅ Final Operational Checklist**

* **✔ Cursor-level UX:** Integrated, non-disruptive AI interaction within the editor.  
* **✔ Local \+ Cloud AI Control:** Seamless management of hybrid model deployment.  
* **✔ Agent Explainability:** Full trace logging of agent thought process and tool use.  
* **✔ Admin Visibility:** Comprehensive Dashboard and Server views.  
* **✔ Editor-First AI System:** Core logic centered around developer productivity in the IDE.  
* **✔ Bangla-Native Agents:** Built-in support for Bangla language persona and output.  
* **✔ Future-Proof Architecture:** Designed with clear protocol layers (MCP, stdio) and multimodal hooks (Audio).

\-----**বিশেষ দ্রষ্টব্য (Critical Agent Operational Directive)**

**TO THE AGENTS WORKING IN THE EDITOR ENVIRONMENT:**

It is paramount that you operate with a continuous loop of observation, indexing, planning, and execution.

1. **Understand the Whole Context:** You **MUST** first read and index the entirety of the current project files and structure to establish an accurate and current world-state model.  
2. **Chain-of-Thought Planning:** For any task, you **MUST** formulate a clear, sequential chain of actions (a Plan) based on your indexed knowledge and the current operational status (observed from the Dashboard/Metrics).  
3. **Short-Term Memory and Iteration:** Maintain an accurate short-term memory of the immediate operation. Execute the plan **step-by-step**, observing the system state and file changes after each step, and adjusting the next step based on the observed reality.  
4. **Terminal/Browser Testing:** All code changes and operational components **MUST** be validated using the Terminal/Browser views as the source of truth for execution environment correctness.  
5. **Database/Configuration Planning:** Before initial work begins, all database table relationships, feature ports, and configuration parameters **MUST** be precisely planned and documented.  
6. **No Mock Responses:** Under no circumstances will you generate speculative or mock/demo responses. If a server is genuinely down or a function fails, the response **MUST** reflect the failure truthfully (e.g., "Server Down," "Error 500"). **No false promises.**  
7. **Package and Dependency Control:** The entire project, including all dependency versions, **MUST** be built into a single, cohesive deployment package, adhering to the versioning plan.
