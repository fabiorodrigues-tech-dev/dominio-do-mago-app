/**
 * Generic Tree Structure Helpers
 * Shared logic for Task and Habit hierarchical operations
 */

export interface TreeNodeBase {
  id: string;
  sortOrder?: number;
}

export interface TreeNodeWithChildren<T> extends TreeNodeBase {
  childItems?: T[];
  childHabits?: T[];
}

export interface TreeNodeWithArea extends TreeNodeBase {
  areaId?: string | null;
  subareaId?: string | null;
  areaPrimaryId?: string | null;
  subareaPrimaryId?: string | null;
}

/**
 * Move a node up in its sibling list by swapping sortOrder values
 * Works for both flat arrays and nested trees
 */
export function moveNodeUp<T extends TreeNodeBase>(
  nodes: T[],
  nodeId: string
): T[] {
  const sorted = [...nodes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const currentIndex = sorted.findIndex(n => n.id === nodeId);
  
  if (currentIndex <= 0) return nodes;
  
  const current = sorted[currentIndex];
  const previous = sorted[currentIndex - 1];
  const currentOrder = current.sortOrder ?? currentIndex + 1;
  const previousOrder = previous.sortOrder ?? currentIndex;
  
  return nodes.map(node => {
    if (node.id === current.id) return { ...node, sortOrder: previousOrder };
    if (node.id === previous.id) return { ...node, sortOrder: currentOrder };
    return node;
  });
}

/**
 * Move a node down in its sibling list by swapping sortOrder values
 */
export function moveNodeDown<T extends TreeNodeBase>(
  nodes: T[],
  nodeId: string
): T[] {
  const sorted = [...nodes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const currentIndex = sorted.findIndex(n => n.id === nodeId);
  
  if (currentIndex === -1 || currentIndex >= sorted.length - 1) return nodes;
  
  const current = sorted[currentIndex];
  const next = sorted[currentIndex + 1];
  const currentOrder = current.sortOrder ?? currentIndex + 1;
  const nextOrder = next.sortOrder ?? currentIndex + 2;
  
  return nodes.map(node => {
    if (node.id === current.id) return { ...node, sortOrder: nextOrder };
    if (node.id === next.id) return { ...node, sortOrder: currentOrder };
    return node;
  });
}

/**
 * Calculate next sortOrder for a new sibling
 */
export function calculateNextSortOrder<T extends TreeNodeBase>(
  siblings: T[]
): number {
  return siblings.reduce((max, node) => Math.max(max, node.sortOrder || 0), 0) + 1;
}

/**
 * Inherit area properties from parent, with proper null handling
 * Uses ?? operator to handle explicit null values correctly
 */
export function inheritAreaProperties<T extends TreeNodeWithArea>(
  childData: Partial<T>,
  parent: T | null,
  task?: T | null
): Pick<T, 'areaId' | 'subareaId'> | Pick<T, 'areaPrimaryId' | 'subareaPrimaryId'> {
  // Check if we're dealing with Habits (areaId) or Tasks (areaPrimaryId)
  const isHabit = parent && 'areaId' in parent;
  
  if (isHabit) {
    // For Habits (areaId/subareaId)
    return {
      areaId: childData.areaId ?? parent?.areaId ?? null,
      subareaId: childData.subareaId ?? parent?.subareaId ?? null,
    } as any;
  }
  
  // For Tasks (areaPrimaryId/subareaPrimaryId)
  return {
    areaPrimaryId: childData.areaPrimaryId ?? parent?.areaPrimaryId ?? task?.areaPrimaryId ?? null,
    subareaPrimaryId: childData.subareaPrimaryId ?? parent?.subareaPrimaryId ?? task?.subareaPrimaryId ?? null,
  } as any;
}

/**
 * Generic aggregation result
 */
export interface AggregationResult {
  totalValue: number;
  totalTime: number;
  areaTotals: Record<string, number>;
}

/**
 * Aggregate values from child nodes recursively
 * Supports both Task (baseValue/plannedTimeMinutes) and Habit (plannedPoints/plannedTimeMinutes)
 */
export function aggregateChildren<T extends TreeNodeWithChildren<T> & TreeNodeWithArea>(
  children: T[],
  getters: {
    getValue: (node: T) => number;
    getTime: (node: T) => number;
    getArea: (node: T) => string | null | undefined;
    getChildren: (node: T) => T[];
    hasChildren: (node: T) => boolean;
  }
): AggregationResult {
  return children.reduce(
    (acc, child) => {
      const childHasChildren = getters.hasChildren(child);
      const childAgg = childHasChildren 
        ? aggregateChildren(getters.getChildren(child), getters)
        : null;
      
      const value = childAgg ? childAgg.totalValue : getters.getValue(child);
      const time = childAgg ? childAgg.totalTime : getters.getTime(child);
      
      const areaTotals: Record<string, number> = { ...acc.areaTotals };
      
      if (childAgg) {
        // Aggregate areas from children
        Object.entries(childAgg.areaTotals).forEach(([areaId, areaValue]) => {
          areaTotals[areaId] = (areaTotals[areaId] || 0) + (areaValue as number);
        });
      } else {
        // Leaf node - count its area if has value
        const area = getters.getArea(child);
        if (area && value > 0) {
          areaTotals[area] = (areaTotals[area] || 0) + value;
        }
      }
      
      return {
        totalValue: acc.totalValue + value,
        totalTime: acc.totalTime + time,
        areaTotals,
      };
    },
    { totalValue: 0, totalTime: 0, areaTotals: {} as Record<string, number> }
  );
}

/**
 * Get top area from aggregation (area with highest value)
 */
export function getTopArea(areaTotals: Record<string, number>): string | null {
  const entries = Object.entries(areaTotals).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 ? entries[0][0] : null;
}
