# Product Requirements Document (PRD): NoteCanopy

## 1. Executive Summary

- **Product Name:** NoteCanopy
- **Status:** Draft
- **Primary Objective:** To provide a non-linear, tree-based desktop interface for interacting with LLMs, enabling deep exploratory learning while preventing context drift and cognitive overhead.

## 2. Problem Statement

- **What is the pain point?** Linear chat interfaces force a sequential approach, leading to "linear fatigue" and "context drift" where irrelevant details from one branch pollute another.
- **Why does this matter?** Complex learning requires maintaining a stable core concept while investigating multiple sub-details without losing the narrative thread.
- **Who are the target users?** Deep Learners (researchers, developers, students) working on desktop environments.

## 3. Goals & Success Metrics

- **Goals:**
  - Visual branching from any response.
  - Contextual inheritance and isolation between sibling branches.
  - Optimized for **Desktop View** (large canvases, mouse/keyboard interaction).
  - Workspace management via folding, summarization, and focus modes.
- **Non-Goals (MVP):**
  - Mobile optimization (Mobile-friendly views are future scope).
  - Branch Merging (later phase).
  - Full system exportability (future scope).
  - Auto-updating children when a parent node is edited (static inheritance is acceptable for MVP).
- **Success Metrics (KPIs):**
  - **Branching Depth:** Avg sub-branches per session.
  - **UI Performance:** Maintaining 60fps during pan/zoom on 100+ nodes.

## 4. User Stories

| ID   | As a...      | I want to...                                           | So that...                                            | Priority |
| ---- | ------------ | ------------------------------------------------------ | ----------------------------------------------------- | -------- |
| US.1 | Deep Learner | Create a branch from any response                      | I can explore sub-topics independently.               | High     |
| US.2 | Researcher   | Collapse branches and see tooltips of original content | I can keep my workspace clean without losing nuance.  | High     |
| US.3 | Developer    | Focus on an active branch (ghosting others)            | I can reduce visual clutter during deep work.         | High     |
| US.4 | Student      | Copy the text content of a specific branch             | I can easily move my findings into other documents.   | Medium   |
| US.5 | User         | Assign colors to specific nodes                        | I can visually categorize different lines of inquiry. | Medium   |

## 5. Functional Requirements

- **Tree-Based Canvas:** Infinite pan/zoom desktop interface (React Flow/D3).
- **Branching & Isolation:**
  - Each node inherits ancestors but is isolated from siblings.
  - Editing a parent does **not** trigger re-generation of existing children.
- **Context Management:**
  - **Ancestor Sliding Window:** Send Root + last N ancestors to manage token limits.
  - **Summarization:** Condense branches into single nodes while preserving original text in tooltips.
- **UI Management:**
  - **Focus Mode:** Ghosting (reducing opacity) of inactive branches.
  - **Semantic Coloring:** Ability to change node background colors.
- **Branch Utilities:** "Copy Branch" feature to extract text from a specific lineage.
- **Request Management:** Sequential queueing of LLM requests to prevent rate limiting.

## 6. Non-Functional Requirements

- **Performance:** Viewport virtualization to handle large trees.
- **Desktop First:** Tailored for mouse wheel zooming and keyboard shortcuts (`Cmd+Enter` to branch).
- **Security:** Local storage of API keys; no middleman server.
- **Scalability:** Handle deep lineages via the sliding window strategy.

## 7. User Experience (UX) & Design

- **Key Components:**
  - **Infinite Canvas:** Primary interaction area.
  - **Ghosting Logic:** Automatically dimming non-ancestor/non-descendant nodes when a node is active.
  - **Visual Breadcrumbs:** A clickable trail at the bottom showing the path to root.
- **Constraint:** Desktop only for MVP. Avoid complex touch gestures in favor of precise mouse interactions.

## 8. Technical Considerations

- **Tech Stack:** React, Zustand (for flat DAG state), React Flow (for virtualization).
- **Data Model:** Flat object map `nodes: { [id]: { content, parentId, children: [], color, isSummarized } }`.
- **Concurrency:** Request worker to handle API calls sequentially.

## 9. Risks & Mitigations

- **Risk:** Tree Sprawl. **Mitigation:** Focus Mode (Ghosting) and Branch Folding.
- **Risk:** Token Overflow. **Mitigation:** Ancestor Sliding Window and manual Pruning.
- **Risk:** Context Loss. **Mitigation:** Original Source Tooltips on summarized nodes.

## 10. Roadmap & Timeline

- **Phase 1 (MVP):** Desktop canvas, branching, sliding window, ghosting, branch copy.
- **Phase 2:** Multi-provider support, session persistence, semantic search.
- **Phase 3:** Branch merging, full export (Markdown/Notion), Mobile "Drill-down" view.
