 
module TextRight.Editor.Internal {
  import Logger = TextRight.Internal.Util.Logger;
  import HtmlUtils = TextRight.Utils.HtmlUtils;

  class BlockRect extends TokenBasedValueFromOneParent<Rect, Block> {
    
    public calculateValue(block: Block) {
      Logger.count("Block.Measure");
      return HtmlUtils.getBoundingClientRectOfElement(Block.getContainerElement(block));
    }

  }

  /**
   * Contains cached data about a block
   */
  export class BlockElementCache {

    private blockRect: BlockRect;
    private lookupData: Map<Node, Rect>;
    // TODO rework DocumentCache to incorporate these ideas
    // TODO self-delete size data when it hasn't been used in a while

    constructor() {
      this.blockRect = new BlockRect();
      this.lookupData = new Map<Node, Rect>();
    }

    /**
     * Clear all previous lookup data
     */
    public resetSizeData() {
      this.lookupData.clear();
    }

    /**
    * Lookup the size of the given node, caching the value so that subsequent lookups
    * of the same node will not need to recalculate the size.
    */
    public lookupSizeData(documentPositioning: SnapshotTokenProvider, block: Block, node: Node): Rect {

      var rect: Rect;
      var offset = this.blockRect.getValue(documentPositioning, block);

      if (this.lookupData.has(node)) {
        rect = this.lookupData.get(node);
      } else {
        Logger.count("Bounds.Calculation");
        var size = HtmlUtils.getBoundingClientRectOf(node);
        size.left -= offset.left;
        size.top -= offset.top;

        this.lookupData.set(node, size);
        rect = size;
      }

      var ret = rect.clone();
      ret.left += offset.left;
      ret.top += offset.top;
      return ret;
    }

    /**
     * Get the cache for the given block, creating it if needed
     */
    public static getFor(block: Block): BlockElementCache {
      var element = <any>Block.getContainerElement(block);

      if (element.__trdBlockCache != null) {
        return element.__trdBlockCache;
      }

      var cache = new BlockElementCache();
      element.__trdBlockCache = cache;
      return cache;
    }
  }
}