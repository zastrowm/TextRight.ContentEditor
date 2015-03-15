
module TextRight.Internal.Caches {
  import Block = TextRight.Editor.Internal.Block;
  import Rect = TextRight.Editor.Internal.Rect;
  import HtmlUtils = TextRight.Utils.HtmlUtils;
  import Logger = TextRight.Internal.Util.Logger;
  
  /**
   * Handles caching the sizes of rectangles needed for measurements. Speeds up
   * measurements at the cost of memory.
   * @remarks IE was the biggest winner of this class
   */
  export class CachedNodeRectManager {

    private lookupData: Map<Node, Rect>;

    constructor() {
      this.lookupData = new Map<Node, Rect>();
    }

    /**
     * Clear all previous lookup data
     */
    public reset() {
      this.lookupData.clear();
    }

    /**
     * Lookup the size of the given node, caching the value so that subsequent lookups
     * of the same node will not need to recalculate the size.
     */
    public lookup(node: Node): Rect {
      if (this.lookupData.has(node)) {
        return this.lookupData.get(node);
      }

      var size = HtmlUtils.getBoundingClientRectOf(node);
      Logger.count("Bounds.Calculation");

      this.lookupData.set(node, size);
      return size;
    }
  }

} 