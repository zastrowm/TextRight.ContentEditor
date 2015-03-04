module TextRight.Editor.Internal {
  import HtmlUtils = TextRight.Utils.HtmlUtils;
  
  /**
   * Manages the current selection and the elements that make up the current selection.
   */ 
  export class SelectionPresenter {

    private elementTop: HTMLElement;
    private elementMid: HTMLElement;
    private elementBot: HTMLElement;

    /**
     * Create a new selection view
     * @param document the element that represents the view of the document
     */
    constructor(private documentModel: DocumentModel) {
      var document = documentModel.rawElement;

      this.elementTop = HtmlUtils.appendNewElement(document, "DIV", ElementClasses.selectionTop);
      this.elementMid = HtmlUtils.appendNewElement(document, "DIV", ElementClasses.selectionMiddle);
      this.elementBot = HtmlUtils.appendNewElement(document, "DIV", ElementClasses.selectionBottom);
    }

    /**
     * Update the display of the selected text
     * 
     * @param selectionStart the cursor the represents the start of the selection
     * @param selectionEnd the cursor that represents the end of the selection
     * @note that the start and end do not necessarily need to be in order
     */
    public update(selectionStart: DocumentCursor, selectionEnd: DocumentCursor): void {

      var endPosition = selectionEnd.getCursorPosition();
      var startPosition = selectionStart.getCursorPosition();

      var endBlock = HtmlUtils.getBoundingClientRectOfElement(selectionEnd.block.contentElement);
      var startBlock = HtmlUtils.getBoundingClientRectOfElement(selectionStart.block.contentElement);

      var isOnSameLine = startPosition.isInlineWith(endPosition);

      var isStartBeforeEnd = isOnSameLine
        ? startPosition.left < endPosition.left
        : startPosition.top < endPosition.top;

      if (!isStartBeforeEnd) {
        // Swap the two so that we can always work with start being at the top
        var tmp = startPosition;
        startPosition = endPosition;
        endPosition = tmp;

        var tmp2 = startBlock;
        startBlock = endBlock;
        endBlock = tmp2;
      }

      // TODO find out how RTL changes the display of the selection
      var rightMost = Math.max(startPosition.left, endPosition.left, startBlock.right, endBlock.right);
      var leftMost = Math.min(startPosition.left, endPosition.left, startBlock.left, endBlock.left);

      var heightOfMiddle = endPosition.top - startPosition.top - startPosition.height;

      if (isOnSameLine) {
        // if the start and end selection are on the same line, we don't need 3 different parts to show the selection,
        // we merely need a selection stretching from start to end

        var height = Math.max(startPosition.height, endPosition.height);
        var top = Math.min(startPosition.top, endPosition.top);

        HtmlUtils.positionElement(this.elementTop, top, startPosition.left, height, endPosition.left - startPosition.left);

        this.elementTop.style.display = "block";
        this.elementMid.style.display = "none";
        this.elementBot.style.display = "none";
      } else {

        // otherwise, we need to display 3 parts: the top which is on the line where the selection begins,
        // the middle which stretches from the start line to the end line, and the bottom which is the line
        // where the selection ends

        // WASBUG make everything integers to prevent floating point errors in the display
        // TODO could we round to nearest something else instead (like 0.5)?
        var topTop = (startPosition.top) | 0;
        var topHeight = (startPosition.height) | 0;

        var midTop = (topTop + topHeight) | 0;
        var midHeight = (heightOfMiddle) | 0;

        var botTop = (midTop + midHeight) | 0;
        // get rid of any cumulative rounding errors by adding in the error found thus far
        var botHeight = (endPosition.top - botTop + endPosition.height ) | 0;

        HtmlUtils.positionElement(this.elementTop, topTop, startPosition.left, topHeight, rightMost - startPosition.left);
        this.elementTop.style.display = "block";

        HtmlUtils.positionElement(this.elementMid, midTop, leftMost, midHeight, rightMost - leftMost);
        this.elementMid.style.display = "block";

        HtmlUtils.positionElement(this.elementBot, botTop, leftMost, botHeight, endPosition.left - leftMost);
        this.elementBot.style.display = "block";
      }
    }

    /**
     * Turn of the selection so that it is no longer visible
     * 
     * To turn the selection back on, use update(start, end)
     */
    public disable(): void {
      this.elementTop.style.display = "none";
      this.elementMid.style.display = "none";
      this.elementBot.style.display = "none";
    }

    /* Get the offset of the given node as if the node was going to be used as the start or end of a range. */
    private getOffset(node: Node) {
      if (node == null)
        return 0;

      return TextRight.Utils.HtmlUtils.findOffsetOf(node) + 1;
    }
  }
}