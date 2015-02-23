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
    constructor(document: HTMLElement) {
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

      var endBlock = selectionEnd.block.contentElement.getBoundingClientRect();
      var startBlock = selectionStart.block.contentElement.getBoundingClientRect();

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

        this.elementTop.style.top = top + 'px';
        this.elementTop.style.height = height + 'px';
        this.elementTop.style.left = startPosition.left + 'px';
        this.elementTop.style.width = (endPosition.left - startPosition.left) + 'px';

        this.elementTop.style.display = "block";
        this.elementMid.style.display = "none";
        this.elementBot.style.display = "none";
      } else {

        // otherwise, we need to display 3 parts: the top which is on the line where the selection begins,
        // the middle which stretches from the start line to the end line, and the bottom which is the line
        // where the selection ends

        this.elementTop.style.top = startPosition.top + 'px';
        this.elementTop.style.left = startPosition.left + 'px';
        this.elementTop.style.height = startPosition.height + 'px';
        this.elementTop.style.width = (rightMost - startPosition.left) + 'px';
        this.elementTop.style.display = "block";

        this.elementMid.style.top = (startPosition.top + startPosition.height) + 'px';
        this.elementMid.style.left = leftMost + 'px';
        this.elementMid.style.height = heightOfMiddle + 'px';
        this.elementMid.style.width = (rightMost - leftMost) + 'px';
        this.elementMid.style.display = "block";

        this.elementBot.style.top = endPosition.top + 'px';
        this.elementBot.style.left = leftMost + 'px';
        this.elementBot.style.height = endPosition.height + 'px';
        this.elementBot.style.width = (endPosition.left - leftMost) + 'px';
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