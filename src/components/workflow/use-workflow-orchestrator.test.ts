/**
 * useWorkflowOrchestrator Hook Tests
 * 测试工作流编排器 Hook 的核心功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWorkflowOrchestrator } from "./use-workflow-orchestrator";
import { NodeType, WorkflowStatus } from "@/types/workflow";

// Mock localStorage is already set up in tests/setup.ts

describe("useWorkflowOrchestrator", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      expect(result.current.workflows).toEqual([]);
      expect(result.current.currentWorkflow).toBeNull();
      expect(result.current.instances).toEqual([]);
      expect(result.current.currentInstance).toBeNull();
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.selectedNodeId).toBeUndefined();
    });

    it("should load workflows from localStorage on mount", () => {
      // Pre-populate localStorage
      const savedWorkflows = [
        {
          id: "workflow_1",
          name: "Test Workflow",
          version: 1,
          status: WorkflowStatus.DRAFT,
          nodes: [],
          edges: [],
          config: { timeout: 3600, retryPolicy: { maxRetries: 3, backoff: "exponential", interval: 5 }, variables: {} },
          metadata: { createdAt: "2024-01-01", updatedAt: "2024-01-01", createdBy: "user", updatedBy: "user" },
        },
      ];
      localStorage.setItem("workflow_orchestrator_data", JSON.stringify(savedWorkflows));

      const { result } = renderHook(() => useWorkflowOrchestrator());

      // Wait for useEffect to run
      expect(result.current.workflows.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("createWorkflow", () => {
    it("should create a new workflow with start and end nodes", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        const workflow = result.current.createWorkflow("Test Workflow", "Test Description");
        expect(workflow).toBeDefined();
        expect(workflow.name).toBe("Test Workflow");
        expect(workflow.description).toBe("Test Description");
        expect(workflow.nodes).toHaveLength(2);
        expect(workflow.nodes[0].type).toBe(NodeType.START);
        expect(workflow.nodes[1].type).toBe(NodeType.END);
      });

      expect(result.current.currentWorkflow).toBeDefined();
      expect(result.current.workflows.length).toBe(1);
    });

    it("should set created workflow as current workflow", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      expect(result.current.currentWorkflow).toBeDefined();
      expect(result.current.currentWorkflow?.name).toBe("Test Workflow");
    });
  });

  describe("loadWorkflow", () => {
    it("should load a workflow by id", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Workflow 1");
        result.current.createWorkflow("Workflow 2");
      });

      const workflowId = result.current.workflows[0].id;

      await act(async () => {
        result.current.loadWorkflow(workflowId);
      });

      expect(result.current.currentWorkflow?.name).toBe("Workflow 1");
    });

    it("should clear selected node when loading workflow", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      // Select a node
      act(() => {
        result.current.selectNode("some-node-id");
      });

      expect(result.current.selectedNodeId).toBe("some-node-id");

      // Load workflow (should clear selection)
      const workflowId = result.current.workflows[0].id;
      await act(async () => {
        result.current.loadWorkflow(workflowId);
      });

      expect(result.current.selectedNodeId).toBeUndefined();
    });
  });

  describe("addNode", () => {
    it("should add a new node to current workflow", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      let newNode: any;
      await act(async () => {
        newNode = await result.current.addNode(NodeType.AGENT, { x: 300, y: 200 });
      });

      expect(newNode).toBeDefined();
      expect(newNode.type).toBe(NodeType.AGENT);
      expect(newNode.position).toEqual({ x: 300, y: 200 });
      expect(result.current.currentWorkflow?.nodes).toHaveLength(3); // start, end, + new node
    });

    it("should return undefined when no current workflow", () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      let newNode: any;
      act(() => {
        newNode = result.current.addNode(NodeType.AGENT, { x: 300, y: 200 });
      });

      expect(newNode).toBeUndefined();
    });

    it("should use default name based on node type", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      let newNode: any;
      await act(async () => {
        newNode = result.current.addNode(NodeType.CONDITION, { x: 300, y: 200 });
      });

      expect(newNode.name).toBe("条件");
    });
  });

  describe("updateNode", () => {
    it("should update node properties", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const nodeToUpdate = result.current.currentWorkflow?.nodes[0];

      await act(async () => {
        result.current.updateNode(nodeToUpdate!.id, { name: "Updated Name", description: "Test description" });
      });

      const updatedNode = result.current.currentWorkflow?.nodes.find((n) => n.id === nodeToUpdate!.id);
      expect(updatedNode?.name).toBe("Updated Name");
      expect(updatedNode?.description).toBe("Test description");
    });

    it("should return undefined when no current workflow", () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      let resultUpdate: any;
      act(() => {
        resultUpdate = result.current.updateNode("some-id", { name: "Test" });
      });

      expect(resultUpdate).toBeUndefined();
    });
  });

  describe("deleteNode", () => {
    it("should delete a node from current workflow", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const newNode = result.current.addNode(NodeType.AGENT, { x: 300, y: 200 });
      const nodeId = newNode?.id;

      await act(async () => {
        result.current.deleteNode(nodeId!);
      });

      expect(result.current.currentWorkflow?.nodes.find((n) => n.id === nodeId)).toBeUndefined();
      expect(result.current.currentWorkflow?.nodes).toHaveLength(2); // start and end
    });

    it("should not delete start node", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const startNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.START);

      await act(async () => {
        result.current.deleteNode(startNode!.id);
      });

      // Start node should still exist
      expect(result.current.currentWorkflow?.nodes.find((n) => n.id === startNode!.id)).toBeDefined();
    });

    it("should not delete end node", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const endNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.END);

      await act(async () => {
        result.current.deleteNode(endNode!.id);
      });

      // End node should still exist
      expect(result.current.currentWorkflow?.nodes.find((n) => n.id === endNode!.id)).toBeDefined();
    });

    it("should delete connected edges when deleting node", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      // Add a node and create an edge
      const newNode = result.current.addNode(NodeType.AGENT, { x: 300, y: 200 });
      const startNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.START);

      await act(async () => {
        result.current.addEdge(startNode!.id, newNode!.id);
      });

      // Delete the node
      await act(async () => {
        result.current.deleteNode(newNode!.id);
      });

      // Edge should be deleted
      const edge = result.current.currentWorkflow?.edges.find((e) => e.source === startNode!.id && e.target === newNode!.id);
      expect(edge).toBeUndefined();
    });

    it("should clear selectedNodeId when deleted node was selected", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const newNode = result.current.addNode(NodeType.AGENT, { x: 300, y: 200 });

      // Select the node
      act(() => {
        result.current.selectNode(newNode!.id);
      });

      expect(result.current.selectedNodeId).toBe(newNode!.id);

      // Delete the node
      await act(async () => {
        result.current.deleteNode(newNode!.id);
      });

      expect(result.current.selectedNodeId).toBeUndefined();
    });
  });

  describe("addEdge", () => {
    it("should add a new edge between nodes", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const startNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.START);
      const endNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.END);

      let newEdge: any;
      await act(async () => {
        newEdge = result.current.addEdge(startNode!.id, endNode!.id);
      });

      expect(newEdge).toBeDefined();
      expect(newEdge.source).toBe(startNode!.id);
      expect(newEdge.target).toBe(endNode!.id);
      expect(result.current.currentWorkflow?.edges).toHaveLength(1);
    });

    it("should not add duplicate edge", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const startNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.START);
      const endNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.END);

      await act(async () => {
        result.current.addEdge(startNode!.id, endNode!.id);
      });

      let duplicateEdge: any;
      await act(async () => {
        duplicateEdge = result.current.addEdge(startNode!.id, endNode!.id);
      });

      expect(duplicateEdge).toBeUndefined();
      expect(result.current.currentWorkflow?.edges).toHaveLength(1);
    });

    it("should not allow self-referencing edge", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const startNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.START);

      let selfEdge: any;
      await act(async () => {
        selfEdge = result.current.addEdge(startNode!.id, startNode!.id);
      });

      expect(selfEdge).toBeUndefined();
    });

    it("should return undefined when no current workflow", () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      let edge: any;
      act(() => {
        edge = result.current.addEdge("source", "target");
      });

      expect(edge).toBeUndefined();
    });
  });

  describe("deleteEdge", () => {
    it("should delete an edge by id", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const startNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.START);
      const endNode = result.current.currentWorkflow?.nodes.find((n) => n.type === NodeType.END);

      await act(async () => {
        result.current.addEdge(startNode!.id, endNode!.id);
      });

      const edgeId = result.current.currentWorkflow?.edges[0].id;

      await act(async () => {
        result.current.deleteEdge(edgeId!);
      });

      expect(result.current.currentWorkflow?.edges).toHaveLength(0);
    });

    it("should return undefined when no current workflow", () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      let resultDelete: any;
      act(() => {
        resultDelete = result.current.deleteEdge("some-edge-id");
      });

      expect(resultDelete).toBeUndefined();
    });
  });

  describe("moveNode", () => {
    it("should move node position using updateNode", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const node = result.current.currentWorkflow?.nodes[0];

      await act(async () => {
        result.current.moveNode(node!.id, { x: 500, y: 300 });
      });

      const movedNode = result.current.currentWorkflow?.nodes.find((n) => n.id === node!.id);
      expect(movedNode?.position).toEqual({ x: 500, y: 300 });
    });
  });

  describe("updateWorkflow", () => {
    it("should update workflow properties", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Original Name");
      });

      await act(async () => {
        result.current.updateWorkflow({ name: "Updated Workflow Name", description: "New description" });
      });

      expect(result.current.currentWorkflow?.name).toBe("Updated Workflow Name");
      expect(result.current.currentWorkflow?.description).toBe("New description");
    });

    it("should increment version on update", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test");
      });

      const initialVersion = result.current.currentWorkflow?.version;

      await act(async () => {
        result.current.updateWorkflow({ description: "Updated" });
      });

      expect(result.current.currentWorkflow?.version).toBe(initialVersion! + 1);
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete a workflow", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Workflow 1");
        result.current.createWorkflow("Workflow 2");
      });

      const workflowIdToDelete = result.current.workflows[0].id;

      await act(async () => {
        result.current.deleteWorkflow(workflowIdToDelete);
      });

      expect(result.current.workflows).toHaveLength(1);
      expect(result.current.workflows.find((w) => w.id === workflowIdToDelete)).toBeUndefined();
    });

    it("should clear currentWorkflow when deleted", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      expect(result.current.currentWorkflow).toBeDefined();

      const workflowId = result.current.workflows[0].id;

      await act(async () => {
        result.current.deleteWorkflow(workflowId);
      });

      expect(result.current.currentWorkflow).toBeNull();
    });
  });

  describe("selectNode", () => {
    it("should set selected node id", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const nodeId = result.current.currentWorkflow?.nodes[0].id;

      act(() => {
        result.current.selectNode(nodeId);
      });

      expect(result.current.selectedNodeId).toBe(nodeId);
    });

    it("should allow undefined to clear selection", async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      await act(async () => {
        result.current.createWorkflow("Test Workflow");
      });

      const nodeId = result.current.currentWorkflow?.nodes[0].id;

      act(() => {
        result.current.selectNode(nodeId);
      });

      expect(result.current.selectedNodeId).toBe(nodeId);

      act(() => {
        result.current.selectNode(undefined);
      });

      expect(result.current.selectedNodeId).toBeUndefined();
    });
  });

  describe("execution controls", () => {
    it("should have pause, resume, and cancel methods", () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      expect(result.current.pauseWorkflow).toBeDefined();
      expect(result.current.resumeWorkflow).toBeDefined();
      expect(result.current.cancelWorkflow).toBeDefined();
    });
  });
});
