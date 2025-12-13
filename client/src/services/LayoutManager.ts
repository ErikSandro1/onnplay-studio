import { LayoutType, LayoutConfig } from '../types/studio';

export interface LayoutPosition {
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  zIndex?: number;
}

export class LayoutManager {
  private currentLayout: LayoutConfig = {
    type: 'single',
    sources: [],
  };
  private listeners: Set<(layout: LayoutConfig) => void> = new Set();

  /**
   * Set layout type and calculate positions
   */
  setLayout(type: LayoutType, sourceIds: string[]) {
    const positions = this.calculatePositions(type, sourceIds.length);

    this.currentLayout = {
      type,
      sources: sourceIds,
      positions,
    };

    this.notifyListeners();
  }

  /**
   * Get current layout
   */
  getLayout(): LayoutConfig {
    return this.currentLayout;
  }

  /**
   * Calculate positions for each source based on layout type
   */
  private calculatePositions(
    type: LayoutType,
    sourceCount: number
  ): LayoutPosition[] {
    switch (type) {
      case 'single':
        return this.calculateSingleLayout();

      case 'pip':
        return this.calculatePIPLayout(sourceCount);

      case 'split':
        return this.calculateSplitLayout(sourceCount);

      case 'grid-2x2':
        return this.calculateGrid2x2Layout(sourceCount);

      case 'grid-3x3':
        return this.calculateGrid3x3Layout(sourceCount);

      default:
        return this.calculateSingleLayout();
    }
  }

  /**
   * Single layout - one source fills entire screen
   */
  private calculateSingleLayout(): LayoutPosition[] {
    return [
      {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 1,
      },
    ];
  }

  /**
   * Picture-in-Picture layout
   * Main source fills screen, secondary sources in corners
   */
  private calculatePIPLayout(sourceCount: number): LayoutPosition[] {
    const positions: LayoutPosition[] = [];

    // Main source (full screen)
    positions.push({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      zIndex: 1,
    });

    // Secondary sources (20% size in corners)
    const pipSize = 20;
    const margin = 2;

    const corners = [
      { x: 100 - pipSize - margin, y: margin }, // Top right
      { x: 100 - pipSize - margin, y: 100 - pipSize - margin }, // Bottom right
      { x: margin, y: 100 - pipSize - margin }, // Bottom left
      { x: margin, y: margin }, // Top left
    ];

    for (let i = 1; i < Math.min(sourceCount, 5); i++) {
      const corner = corners[i - 1];
      positions.push({
        x: corner.x,
        y: corner.y,
        width: pipSize,
        height: pipSize,
        zIndex: i + 1,
      });
    }

    return positions;
  }

  /**
   * Split layout - divide screen equally
   */
  private calculateSplitLayout(sourceCount: number): LayoutPosition[] {
    const positions: LayoutPosition[] = [];

    if (sourceCount === 2) {
      // Horizontal split
      positions.push(
        { x: 0, y: 0, width: 50, height: 100, zIndex: 1 },
        { x: 50, y: 0, width: 50, height: 100, zIndex: 1 }
      );
    } else if (sourceCount === 3) {
      // One on left, two stacked on right
      positions.push(
        { x: 0, y: 0, width: 50, height: 100, zIndex: 1 },
        { x: 50, y: 0, width: 50, height: 50, zIndex: 1 },
        { x: 50, y: 50, width: 50, height: 50, zIndex: 1 }
      );
    } else {
      // Default to grid for more sources
      return this.calculateGrid2x2Layout(sourceCount);
    }

    return positions;
  }

  /**
   * 2x2 Grid layout - up to 4 sources
   */
  private calculateGrid2x2Layout(sourceCount: number): LayoutPosition[] {
    const positions: LayoutPosition[] = [];

    const grid = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 0, y: 50 },
      { x: 50, y: 50 },
    ];

    for (let i = 0; i < Math.min(sourceCount, 4); i++) {
      positions.push({
        x: grid[i].x,
        y: grid[i].y,
        width: 50,
        height: 50,
        zIndex: 1,
      });
    }

    return positions;
  }

  /**
   * 3x3 Grid layout - up to 9 sources
   */
  private calculateGrid3x3Layout(sourceCount: number): LayoutPosition[] {
    const positions: LayoutPosition[] = [];

    const cellWidth = 100 / 3;
    const cellHeight = 100 / 3;

    for (let i = 0; i < Math.min(sourceCount, 9); i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;

      positions.push({
        x: col * cellWidth,
        y: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
        zIndex: 1,
      });
    }

    return positions;
  }

  /**
   * Update source at specific position
   */
  updateSourceAtPosition(index: number, sourceId: string) {
    if (index >= 0 && index < this.currentLayout.sources.length) {
      this.currentLayout.sources[index] = sourceId;
      this.notifyListeners();
    }
  }

  /**
   * Add source to layout
   */
  addSource(sourceId: string) {
    this.currentLayout.sources.push(sourceId);
    
    // Recalculate positions
    const positions = this.calculatePositions(
      this.currentLayout.type,
      this.currentLayout.sources.length
    );
    this.currentLayout.positions = positions;

    this.notifyListeners();
  }

  /**
   * Remove source from layout
   */
  removeSource(sourceId: string) {
    const index = this.currentLayout.sources.indexOf(sourceId);
    if (index !== -1) {
      this.currentLayout.sources.splice(index, 1);
      
      // Recalculate positions
      const positions = this.calculatePositions(
        this.currentLayout.type,
        this.currentLayout.sources.length
      );
      this.currentLayout.positions = positions;

      this.notifyListeners();
    }
  }

  /**
   * Subscribe to layout changes
   */
  subscribe(listener: (layout: LayoutConfig) => void) {
    this.listeners.add(listener);
    listener(this.currentLayout);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentLayout));
  }

  /**
   * Cleanup
   */
  destroy() {
    this.listeners.clear();
  }
}

// Singleton instance
export const layoutManager = new LayoutManager();
