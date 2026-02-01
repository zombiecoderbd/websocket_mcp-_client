**MCP-Editor Agent Architecture: A Technical Deep Dive**

This document outlines the Model Context Protocol (MCP)-Editor Agent architecture, establishing a clear separation of concerns, roles, and communication protocols based on industry best practices for modular and scalable systems.**I. Architectural Tenets (The Big Picture)**

The core philosophy of this architecture is centralized intelligence and decentralized execution, ensuring the Editor remains a thin client and the MCP acts as the definitive source of truth and control.

**Core Hierarchy:**

* **MCP (Model Context Protocol):** The **Leader** (Core Intelligence).  
* **Editor Bridge:** The **Client** (UI/Event Source).  
* **Agent Layer:** The **Worker** (Execution Engine).  
* **LSP/DAP:** The **Optional Specialist** (Third-party integration).

**Principle of Separation:**

* **UI/Presentation (Editor):** Solely responsible for rendering the UI, capturing user events, and routing them to the MCP.  
* **Intelligence/Logic (MCP Core):** Solely responsible for decision-making, context management, persona enforcement, and protocol negotiation.  
* **Task Execution (Agent Layer):** Solely responsible for running LLM calls, executing tools, and managing task state.

\-----**II. MCP Core: The Leader and Single Source of Truth**

The MCP Core is the central nervous system of the entire ecosystem. It normalizes all incoming requests and routes them to the appropriate processing unit.**A. Core Responsibilities (Current Scope)**

| Responsibility | Description | Rationale |
| ----- | :---: | :---: |
| **1\. Identity & Context Control** | Manages the currently active **Agent Persona**, enforces **Tool Permissions** (access control list), and aggregates **Editor Metadata** (user location, file state). | Ensures deterministic, secure, and context-aware responses, enforcing the principle of least privilege for Agents. |
| **2\. Request Normalization** | Converts disparate Editor events (VS Code, CLI, Mobile) into a single, standardized, internal MCP input schema. | Decouples the core logic from the client layer, enabling seamless integration with any editor environment. |
| **3\. Decision Router** | Determines the optimal execution path for a given user request: pure LLM generation, external Tool call (e.g., file I/O, shell), or delegation to an LSP/DAP proxy. | This is the core intelligence layer, minimizing latency and cost by avoiding unnecessary LLM calls when a simpler tool or specialist is sufficient. |
| **4\. Protocol Gatekeeper** | Manages external communication via various protocols (**STDIO, HTTP, WebSocket**, future: gRPC), acting as the single point of entry/exit. | Centralizes protocol handling, allowing Agents and internal modules to be protocol-agnostic. |

**The "No Direct Communication" Mandate:** The Editor **must never** communicate directly with the Model or the Tool layer. All interactions must be brokered and sanctioned by the MCP Core.**B. Internal Module Structure**

The `mcp-core/` directory reflects the modularity required for maintainability and scalability.  
mcp-core/  
 ├─ context/               \# State management and identity  
 │   ├─ persona.ts         \# Agent personality definitions and validation  
 │   ├─ editor-meta.ts     \# Normalized, aggregated metadata from the Editor Bridge  
 │   └─ session.ts         \# Long-running session context (e.g., conversation history)  
 ├─ router/                \# The decision-making unit  
 │   ├─ intent-resolver.ts \# Maps natural language/commands to execution types (LLM, Tool, LSP)  
 │   └─ tool-dispatcher.ts \# Manages execution of allowed external tools  
 ├─ protocol/              \# Communication layer abstractions  
 │   ├─ stdio.ts           \# Protocol implementation for local, fast communication  
 │   ├─ http.ts            \# REST/RPC implementation for remote communication  
 │   └─ ws.ts              \# WebSocket implementation for streaming results  
 ├─ memory/                \# Persistent and ephemeral state storage  
 │   ├─ short-term.ts      \# Context window and immediate conversation history (e.g., Redis/in-memory cache)  
 │   └─ long-term.ts       \# Knowledge base, fine-tuning data, and user preferences  
 └─ audit/                 \# Observability and logging  
     ├─ logs.ts            \# Detailed request/response logging for traceability  
     └─ metrics.ts         \# Performance and usage tracking (latency, tokens, cost)  
\-----**III. Editor Bridge: The Thin Client and Event Source**

The Editor Bridge (e.g., a VS Code extension, Neovim plugin) is the **Follower**. Its primary role is to observe the user's environment and translate user actions into normalized requests for the MCP.**A. Bridge Responsibilities**

| Responsibility | Description |
| ----- | :---: |
| **1\. Editor Event Capture** | Continuously monitors and captures dynamic editor state, including **cursor position**, **selected text**, **open file context**, and **command palette actions**. |
| **2\. Metadata Generation** | Constructs the necessary contextual metadata for every request, which is included as headers or a standardized request payload. |
| **3\. Enforcing the No Brain Rule** | The Editor Bridge must contain **no business logic, decision-making, or model interaction logic**. It is purely a conduit and a state collector. |

**Standardized Metadata Payload (Sent with every request header):**  
{  
  "editor": "vscode",  
  "editorVersion": "1.86",  
  "os": "linux",  
  "workspace": "/home/sahon/project",  
  "language": "python",  
  "cursor": {  
    "line": 42,  
    "column": 13  
  }  
}  
**B. Folder Structure**  
editor-bridge/  
 ├─ src/  
 │   ├─ events/              \# Editor-specific listeners and handlers  
 │   │   ├─ onSelect.ts      \# Handles text selection events  
 │   │   ├─ onSave.ts        \# Handles file save events (potential for background analysis)  
 │   │   └─ onCommand.ts     \# Handles explicit user commands (e.g., "refactor this")  
 │   ├─ transport/           \# Protocol implementations for communicating with the MCP  
 │   │   ├─ stdio.ts         \# Local IPC transport  
 │   │   └─ http.ts          \# Remote transport (e.g., to a cloud-hosted MCP)  
 │   └─ index.ts             \# Entry point and initialization  
 └─ package.json             \# Dependencies and metadata  
\-----**IV. Agent Layer: The Modular Execution Engine**

The Agent Layer consists of various execution engines (Agents) that perform the work dictated by the MCP. Agents are **Workers**; they adhere strictly to the rules and context provided by the Leader (MCP).**A. Agent Responsibilities**

| Responsibility | Description |
| ----- | ----- |
| **1\. Persona-Bound Execution** | The Agent must strictly adhere to the defined **persona** (e.g., `strict coder`, `senior reviewer`) enforced by the MCP during the LLM call prompt. |
| **2\. Tool-Awareness** | Agents can only utilize tools explicitly designated as **allowedTools** in their contract by the MCP. Any attempt to use a forbidden tool must result in an immediate error or rejection. |
| **3\. Status Tracking** | Agents must expose their current operational status for real-time monitoring by the MCP and eventual display in the Editor UI. |

**Required Agent View Metrics:**

* `state`: `idle` / `thinking` / `running` / `error`  
* `lastTask`: The brief description of the task currently being processed.  
* `responseTime`: Latency of the last completed task (in milliseconds).

**B. Agent Minimum Contract (Configuration)**

Every Agent instance requires a minimal configuration validated by the MCP upon registration.

{

  "agentId": "editor-agent-1",

  "persona": "calm-senior-dev",

  "allowedTools": \["fs.read", "fs.write", "shell.run", "lsp.proxy"\],

  "memory": true

}

\-----**V. LSP / DAP Integration: The Optional Specialist**

A critical architectural decision is to treat Language Server Protocol (LSP) and Debug Adapter Protocol (DAP) capabilities as **Optional Specialists** to be leveraged, not rebuilt.**A. Current Strategy (Phase-1)**

* **Proxying Existing Services:** Instead of implementing a full LSP/DAP from scratch, we will proxy calls to existing, mature LSP/DAP servers (e.g., `pylsp`, `jdtls`).  
* **MCP Decision Point:** The MCP's Decision Router is responsible for determining if a request (e.g., "fix this error") is best handled by:  
  1. A standard LLM call (for conceptual fixes).  
  2. A Tool call (for file manipulation).  
  3. Delegation to the LSP Proxy (for precise, symbolic operations like "find all references").

**Justification:** This approach accelerates time-to-market and focuses development efforts on the core value proposition: context management and intelligent routing, rather than replicating mature, complex protocol implementations.-----**VI. Protocol Strategy and HeadersA. Communication Protocol Matrix**

The MCP decides which protocol is used based on the deployment scenario and requirement.

| Protocol | Deployment Context | Rationale and Best Practice |
| ----- | ----- | ----- |
| **STDIO (Standard I/O)** | Local Editor (e.g., VS Code extension calling a local Agent executable) | **Fast, simple, low-latency IPC**. Ideal for maximizing local performance. |
| **HTTP/RPC** | Remote MCP Service (Cloud or LAN-hosted) | **Debug-friendly, stateless**. Standard for remote service interaction and firewall traversal. |
| **WebSocket (WS)** | Streaming Results (Large refactors, continuous feedback) | **Stateful, low-latency push/pull**. Required for a seamless, "Cursor-like" streaming feel. |

**B. Standardized MCP Headers**

All requests transmitted between the Editor Bridge and the MCP (or between MCP and Agent) must include these standardized headers for end-to-end traceability and context enforcement.

{

  "x-mcp-session": "uuid",      // Unique ID for the entire user session (long-running)

  "x-agent-id": "editor-agent-1", // The specific Agent instance targeted for execution

  "x-persona": "senior-dev",    // The required persona for the LLM execution

  "x-editor": "vscode",         // Source client identification

  "x-request-id": "uuid"        // Unique ID for the current transaction (short-lived, for logging)

}

**C. Standardized Response Pattern**

The MCP ensures all responses adhere to a consistent structure, regardless of the underlying Agent or Tool.

{

  "status": "ok | error",

  "type": "text | tool-call-request | tool-call-response | lsp-response | error",

  "latencyMs": 320, // Total round-trip latency from MCP ingress to response egress

  "payload": {

    // Content varies based on 'type' (e.g., generated code, tool output, error stack trace)

  }

}

\-----**VII. Implementation Phases (Roadmap)**

The development is segmented to ensure a stable, deterministic foundation before scaling to complex, multi-modal capabilities.**Phase 1: Deterministic Core (Current Focus)**

* **Goal:** Establish a reliable, traceable, single-turn transaction loop.  
* **Flow:** `Editor (Event) → MCP (Decision) → Agent (Execution) → Text Response`.  
* **Key Traits:** **Deterministic** (predictable output for a given input), **Traceable** (full audit logs via `x-request-id`), **Single-Agent/Tool** execution.

**Phase 2: Goal State (Future Vision)**

* **Goal:** Achieve a fully autonomous, predictive, and collaborative system.  
* **Key Features:**  
  * **Multi-Agent Coordination:** Complex tasks can be broken down and delegated across specialized Agents (e.g., a "Reviewer Agent" checks the code produced by a "Coder Agent").  
  * **Tool Graphing/Chaining:** Agents can dynamically chain multiple tool and LLM calls in a sophisticated action sequence (e.g., `fs.read` \-\> `LLM Refactor` \-\> `shell.run Tests` \-\> `fs.write`).  
  * **Predictive Action:** The system anticipates the user's next step and proactively fetches context or prepares suggestions (e.g., auto-suggesting imports or function completions based on context, before the user types).

