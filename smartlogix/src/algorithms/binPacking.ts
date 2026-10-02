import type { 
  RestockWarehouseCapacity, 
  BinPackingResult, 
  WarehouseAllocationItem 
} from '../types/database.types';

export interface BinPackingInput {
  productId: string;
  totalQuantity: number;
  warehouses: RestockWarehouseCapacity[];
}

/**
 * Bin Packing Algorithm for Warehouse Restock Allocation
 * 
 * Strategy: First Fit Decreasing (FFD)
 * 
 * In standard classic 1D Bin Packing, items of varying sizes are packed into identical or variable-capacity bins.
 * In the context of warehouse inventory restock allocation:
 * - Each warehouse acts as a variable-capacity Bin whose capacity is its available storage:
 *     available capacity = max(0, storage_capacity - currently occupied capacity)
 * - The incoming replenishment stock represents an aggregate lot of inventory units.
 * - The warehouses/bins are sorted in decreasing order of available capacity (First Fit Decreasing heuristic),
 *   allowing larger storage centers to absorb high-volume batches efficiently and minimizing fragmentation.
 * - For discrete lots or chunked shipments, chunks are placed into the first warehouse with sufficient room.
 *   If the remaining quantity exceeds the current warehouse's room, the warehouse is filled to its available limit,
 *   and the remainder cascades to the next warehouse in decreasing capacity order.
 * 
 * Time Complexity:
 * - Sorting bins by capacity: O(m log m), where m is the number of active warehouses.
 * - Allocation scan: O(m).
 * - Total Time Complexity: O(m log m) where m is typically small (<= 50 warehouses).
 * 
 * Space Complexity:
 * - O(m) to construct the allocation proposal and telemetry breakdown.
 * 
 * Determinism:
 * - Pure function, strictly deterministic. No random seeds or side effects.
 */
export function solveRestockBinPacking(input: BinPackingInput): BinPackingResult {
  const startTime = performance.now();
  const { productId, totalQuantity, warehouses } = input;

  if (totalQuantity <= 0) {
    const endTime = performance.now();
    return {
      algorithmName: 'First Fit Decreasing (FFD) Bin Packing',
      productId,
      totalRequested: totalQuantity,
      totalAllocated: 0,
      unallocatedQuantity: 0,
      allocations: [],
      warehousesEvaluated: warehouses.length,
      warehousesUtilized: 0,
      executionTimeMs: Number((endTime - startTime).toFixed(3))
    };
  }

  // 1. Filter warehouses to those with positive available capacity
  // 2. Sort bins descending by availableCapacity (First Fit Decreasing)
  // Tie-breaker: warehouse name ascending for strict determinism
  const sortedBins = [...warehouses]
    .filter(w => w.availableCapacity > 0)
    .sort((a, b) => {
      if (b.availableCapacity !== a.availableCapacity) {
        return b.availableCapacity - a.availableCapacity;
      }
      return a.warehouse.name.localeCompare(b.warehouse.name);
    });

  let remainingToAllocate = totalQuantity;
  const allocations: WarehouseAllocationItem[] = [];

  for (const bin of sortedBins) {
    if (remainingToAllocate <= 0) break;

    const allocatable = Math.min(remainingToAllocate, bin.availableCapacity);
    if (allocatable > 0) {
      allocations.push({
        warehouseId: bin.warehouse.id,
        warehouseName: bin.warehouse.name,
        warehouseCode: bin.warehouse.code,
        allocatedQuantity: allocatable,
        initialAvailableCapacity: bin.availableCapacity,
        remainingCapacity: bin.availableCapacity - allocatable
      });
      remainingToAllocate -= allocatable;
    }
  }

  const endTime = performance.now();
  const totalAllocated = totalQuantity - remainingToAllocate;

  return {
    algorithmName: 'First Fit Decreasing (FFD) Bin Packing',
    productId,
    totalRequested: totalQuantity,
    totalAllocated,
    unallocatedQuantity: remainingToAllocate,
    allocations,
    warehousesEvaluated: warehouses.length,
    warehousesUtilized: allocations.length,
    executionTimeMs: Number((endTime - startTime).toFixed(3))
  };
}
