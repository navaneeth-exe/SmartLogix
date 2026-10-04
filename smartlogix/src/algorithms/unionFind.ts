/**
 * Disjoint Set / Union-Find Data Structure with Path Compression and Union by Rank
 * 
 * Mathematical Properties & Complexity:
 * - Represents a partition of a set into disjoint connected components.
 * - find(x): Traverses parent pointers to find representative root.
 *   Applies Two-Pass Path Compression, flattening the tree depth.
 * - union(x, y): Merges two subsets by attaching the root of the lower-rank tree
 *   under the root of the higher-rank tree (Union by Rank).
 * 
 * Asymptotic Complexity:
 * - Amortized Time Complexity: O(α(V)) per operation, where α is the Inverse Ackermann function.
 *   For all physically conceivable practical graphs (V < 10^80), α(V) <= 4, operating in near-constant time.
 * - Space Complexity: O(V) for parent and rank index arrays.
 */

export class UnionFind<T = string> {
  private parent: Map<T, T>;
  private rank: Map<T, number>;
  private componentCount: number;

  constructor(elements: Iterable<T> = []) {
    this.parent = new Map<T, T>();
    this.rank = new Map<T, number>();
    this.componentCount = 0;

    for (const elem of elements) {
      this.makeSet(elem);
    }
  }

  /**
   * Initializes a new singleton disjoint set containing element x.
   */
  public makeSet(x: T): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      this.componentCount++;
    }
  }

  /**
   * Finds the canonical representative (root) of the set containing x.
   * Employs path compression so subsequent queries run in O(1) amortized time.
   */
  public find(x: T): T {
    if (!this.parent.has(x)) {
      this.makeSet(x);
      return x;
    }

    const root = this.parent.get(x)!;
    if (root !== x) {
      const canonicalRoot = this.find(root);
      this.parent.set(x, canonicalRoot); // Path compression
      return canonicalRoot;
    }

    return x;
  }

  /**
   * Unites the dynamic sets containing x and y using Union by Rank.
   * Returns true if a merge occurred (x and y were in disjoint components).
   * Returns false if x and y were already in the same component (cycle prevention).
   */
  public union(x: T, y: T): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) {
      return false; // Already in the same connected component
    }

    const rankX = this.rank.get(rootX) ?? 0;
    const rankY = this.rank.get(rootY) ?? 0;

    // Attach lower-rank tree under root of higher-rank tree
    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }

    this.componentCount--;
    return true;
  }

  /**
   * Tests whether elements x and y belong to the same connected component.
   */
  public connected(x: T, y: T): boolean {
    return this.find(x) === this.find(y);
  }

  /**
   * Returns the total number of disjoint connected components.
   */
  public getComponentCount(): number {
    return this.componentCount;
  }

  /**
   * Returns all elements grouped by their canonical component representative root.
   */
  public getComponents(): Map<T, T[]> {
    const components = new Map<T, T[]>();
    for (const elem of this.parent.keys()) {
      const root = this.find(elem);
      const list = components.get(root) ?? [];
      list.push(elem);
      components.set(root, list);
    }
    return components;
  }
}
