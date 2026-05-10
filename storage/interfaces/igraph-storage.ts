import type { GraphData, GraphNode, GraphEdge } from "./storage-types.js";

export interface IGraphStorage {
  /** Persist a complete knowledge graph under a given name */
  save(name: string, graph: GraphData): Promise<void>;

  /** Load a previously persisted graph by name */
  load(name: string): Promise<GraphData | null>;

  /** Remove a graph by name */
  invalidate(name: string): Promise<void>;

  /** List every persisted graph name */
  list(): Promise<string[]>;

  /** Merge additional nodes and edges into an existing graph */
  merge(name: string, nodes: GraphNode[], edges: GraphEdge[]): Promise<void>;

  /** Extract a sub-graph containing only the specified node IDs */
  subgraph(name: string, nodeIds: string[]): Promise<GraphData | null>;
}
