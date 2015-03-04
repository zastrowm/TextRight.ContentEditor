module TextRight.Editor.Internal {
  import HtmlUtils = TextRight.Utils.HtmlUtils;

  /**
   * A cursor pointing to a place between two characters.
   */
  export class DocumentCursor {
    /**
     * Constructor.
     */
    constructor(
      public block: BlockItem,
      public spanElement: HTMLSpanElement,
      public textNode: Node) {
    }

    /**
     * Update the cursor to point at the same location as the other cursor
     */
    public cloneFrom(cursor: DocumentCursor) {
      this.setTo(cursor.block, cursor.spanElement, cursor.textNode);
    }

    /**
     * Update the cursor to point at the given position
     */
    public setTo(block: BlockItem, spanElement: HTMLSpanElement, textNode: Node) {
      this.block = block;
      this.spanElement = spanElement;
      this.textNode = textNode;
    }

    /**
     * Verify that the various getters do not throw any exceptions, as they never should.
     * Used for debugging purposes
     * 
     * @returns undefined value that has no meaning
     */
    public validate(): any {
      if (this.spanElement.parentElement.parentElement !== this.block.containerElement)
        throw "Incorrect container element";

      // access each getter (ors don't really matter)
      var isValid = 0
        | <any>this.isBeginningOfBlock
        | <any>this.isEndOfBlock
        | <any>this.block.isBeginningOfDocument
        | <any>this.block.isEndOfDocument
        ;

      return isValid;
    }

    /**
     * Makes a deep copy of this object.
     * @return A copy of this object.
     */
    public clone(): DocumentCursor {
      return new DocumentCursor(this.block, this.spanElement, this.textNode);
    }

    /**
     * True if the cursor is currently pointing to just before the first element in the
     * block.
     */
    public get isBeginningOfBlock(): boolean {
      return this.textNode == null
        && this.previousSpan.classList.contains(ElementClasses.firstChildElement);
    }

    /**
     * True if the cursor is currently pointing to the last element in the block.
     */
    public get isEndOfBlock(): boolean {
      if (!this.isEndOfSpan) {
        return false;
      }

      return this.nextSpan.classList.contains(ElementClasses.lastChildElement);
    }

    /**
     * The next node that will be selected if the cursor is advanced forward. Returns null
     * if at the end of the block.
     */
    public get nextNode(): Node {
      if (this.isBeginningOfBlock) {
        return this.spanElement.firstChild;
      }

      if (this.isEndOfBlock) {
        return null;
      }

      if (this.isEndOfSpan) {
        return this.nextSpan.firstChild;
      } else {
        return this.textNode.nextSibling;
      }
    }

    private get previousSpan(): HTMLSpanElement {
      return <HTMLSpanElement>this.spanElement.previousElementSibling;
    }

    private get nextSpan(): HTMLSpanElement {
      return <HTMLSpanElement>this.spanElement.nextElementSibling;
    }

    /**
     * True if the cursor is currently pointing at the last child of the
     * current span
     */
    public get isEndOfSpan(): boolean {
      return this.textNode === this.spanElement.lastChild;
    }

    /** Gets the position of the cursor if it was to be drawn. */
    public getCursorPosition(): Rect {
      if (this.isBeginningOfBlock) {
        // the only thing we have a position of is the first span
        return DocumentCursor.rightOf(HtmlUtils.getBoundingClientRectOfElement(this.previousSpan));
      }

      if (this.isEndOfBlock) {
        // we don't have a nextNode so the block below will not work
        return DocumentCursor.rightOf(HtmlUtils.getBoundingClientRectOf(this.textNode));
      }

      var rect = HtmlUtils.getBoundingClientRectOf(this.textNode);
      var nextRect = HtmlUtils.getBoundingClientRectOf(this.nextNode);

      var point: Rect;

      // TODO fix bug that occurs when at end of line and IE shows a double height line.
      if (nextRect.top > rect.top) {
        // the next character would end up on the next line.  This occurs most often
        // when we're at the end of "virtual" line in the paragraph, and we have a
        // space character. The position of the next character is actually on
        // the next line, and so we re-position the cursor there
        point = DocumentCursor.leftOf(nextRect);
      } else {
        point = DocumentCursor.rightOf(rect);
      }

      return point;
    }

    /**
     * Create a position which looks at the right side of the given client rectangle.
     */
    private static rightOf(rect: ClientRect) {
      return new Rect(rect.top, rect.right, rect.height, 0);
    }

    /**
    * Create a position which looks at the left side of the given client rectangle.
    */
    private static leftOf(rect: ClientRect) {
      return new Rect(rect.top, rect.left, rect.height, 0);
    }

    /* Add the given element at the cursor position, after the next element. */
    public add(element: Node) {
      if (this.isBeginningOfBlock) {
        this.spanElement.insertBefore(element, this.spanElement.firstChild);
      } else {
        this.spanElement.insertBefore(element, this.textNode.nextSibling);
      }
    }

    /** Moves the position to the beginning of the given paragraph. */
    public moveToBeginningOf(block: BlockItem) {
      this.block = block;
      this.spanElement = block.firstContentSpan;
      this.textNode = null;
    }

    /**
     * Moves the cursor to the end of the designated block.
     */
    public moveToEndOf(block: BlockItem) {
      this.block = block;
      this.spanElement = block.lastContentSpan;
      this.textNode = this.spanElement.lastChild;
    }

    /**
    * Moves the cursor forward within the current block if not already at the
    * beginning of the paragraph.
    * @return true if moved forward, false if it could not because it was already
    *         at the end of the block.
    */
    public moveForwardInBlock(): boolean {
      if (this.isEndOfBlock) {
        return false;
      }

      // NOTE: the following logic requires that empty spans do not exist

      if (this.isBeginningOfBlock) {
        this.textNode = this.spanElement.firstChild;
      } else if (this.isEndOfSpan) {
        this.spanElement = this.nextSpan;
        this.textNode = this.spanElement.firstChild;
      } else {
        this.textNode = this.textNode.nextSibling;
      }

      return true;
    }

    /**
     * Moves the cursor backwards within the current block if not already at the
     * end of the paragraph.
     * @return true if moved backwards, false if it could not because it was
     *         already at the beginning of the block.
     */
    public moveBackwardInBlock(): boolean {
      if (this.isBeginningOfBlock) {
        return false;
      }

      // NOTE: the following logic requires that empty spans do not exist

      this.textNode = this.textNode.previousSibling;

      // we're at the beginning of a span (but not the beginning of the block) , so fix it
      // up to look at the last text part of the previous span.
      if (!this.isBeginningOfBlock && this.textNode === null) {
        this.spanElement = this.previousSpan;
        this.textNode = this.spanElement.lastChild;
      }

      return true;
    }

    /**
      * Moves the cursor backwards through the document.
      * @return true if the cursor was moved backwards, false if it could not be
      *         moved because it is already at the beginning of the document.
      */
    public moveBackwards(): boolean {
      if (!this.moveBackwardInBlock()) {
        var block = this.block;
        if (block.isBeginningOfDocument) {
          // can't do anything, we're at the beginning
          return false;
        }

        this.moveToEndOf(block.previousBlock);
      }

      return true;
    }

    /**
     * Moves the cursor forward through the document.
     * @return true if the cursor was moved forward, false if it could not be
     *         moved because it is already at the end of the document.
     */
    public moveForward(): boolean {
      if (!this.moveForwardInBlock()) {
        // only fails if we're at the end
        var block = this.block;

        if (block.isEndOfDocument) {
          // can't do anything, we're at the end
          return false;
        }

        this.moveToBeginningOf(block.nextBlock);
      }

      return true;
    }

    /**
    * Move the cursor up in the document.
    * @param {CursorNavigationState} how to move the cursor upwards.
    */
    public moveUpwards(state: CursorNavigationState = null) {
      if (state == null) {
        state = CursorNavigationState.fromPosition(this.getCursorPosition().left);
      }

      var iterator = this.clone();
      if (iterator.moveToEndOfPreviousLine()) {
        iterator.moveUsingState(state);
        this.cloneFrom(iterator);
      }
    }

    /**
    * Move the cursor down in the document.
    * @param {CursorNavigationState} how to move the cursor downwards.
    */
    public moveDownwards(state: CursorNavigationState = null) {
      if (state == null) {
        state = CursorNavigationState.fromPosition(this.getCursorPosition().left);
      }

      var iterator = this.clone();
      if (iterator.moveToBeginningOfNextLine()) {
        iterator.moveUsingState(state);
        this.cloneFrom(iterator);
      }
    }

    /**
     * Move to the beginning of the current line.
     * @return true if the cursor moved.
     */
    public moveToBeginningOfLine(): boolean {
      var originalPosition = this.getCursorPosition();
      var numTurns = 0;

      // We keep moving until we're not on the line anymore, and then correct
      // back if we go too far.
      while (this.moveBackwardInBlock()) {
        numTurns++;
        if (!this.getCursorPosition().isInlineWith(originalPosition)) {
          break;
        }
      }

      switch (numTurns) {
        case 0:
          // didn't move at all
          return false;
        case 1:
          if (!this.isBeginningOfBlock) {
            // moved, but moved onto another line
            this.moveForwardInBlock();
          }
          return false;
        default:
          if (!this.isBeginningOfBlock) {
            // moved, but moved onto another line
            this.moveForwardInBlock();
          }
          return true;
      }
    }

    /**
     * Move the cursor to the beginning of the next line, even if that line exists
     * in the next block.
     * @return true if the cursor moved.
     */
    public moveToBeginningOfNextLine(): boolean {
      var iterator = this.clone();

      iterator.moveToEndOfLine();

      // then move one past that
      if (!iterator.moveForward()) {
        return false;
      }

      // if it was successful, then use that
      this.cloneFrom(iterator);
      return true;
    }

    /**
     * Move to the end of the current line.
     * @return true if the cursor moved
     */
    public moveToEndOfLine(): boolean {
      var originalPosition = this.getCursorPosition();
      var numTurns = 0;

      // We keep moving until we're not on the line anymore, and then correct
      // back if we go too far.
      while (this.moveForwardInBlock()) {
        numTurns++;
        if (!this.getCursorPosition().isInlineWith(originalPosition)) {
          break;
        }
      }

      switch (numTurns) {
        case 0:
          // didn't move at all
          return false;
        case 1:
          if (!this.isEndOfBlock) {
            // moved, but moved onto another line
            this.moveBackwardInBlock();
          }
          return false;
        default:
          if (!this.isEndOfBlock) {
            // moved, but moved onto another line
            this.moveBackwardInBlock();
          }
          return true;
      }
    }

    /**
     * Move to the end of the previous line, even if the previous line exists in
     * another block.
     * @return true if the cursor moved.
     */
    public moveToEndOfPreviousLine(): boolean {
      var iterator = this.clone();

      iterator.moveToBeginningOfLine();

      if (!iterator.moveBackwards()) {
        return false;
      }

      this.cloneFrom(iterator);
      return true;
    }

    /**
     * Move towards the given x,y coordinate, staying within the current block
     */
    public moveTowardsPosition(x: number, y: number) {
      var iterator = this.clone();
      var position = iterator.getCursorPosition();

      // TODO we currently assume that we're moving top-left down, but
      // TODO we should check which direction we should move in 

      // get onto the current line
      while (y > position.top + position.height) {

        if (!iterator.moveForwardInBlock()) {
          break;
        }
        position = iterator.getCursorPosition();
      }

      iterator.moveTowards(x);

      this.cloneFrom(iterator);
    }

    /**
     * Move the cursor towards the given x coordinate
     * @param {number} x location where the cursor is desired
     * @return true if the cursor moved
     */
    private moveTowards(x: number): boolean {
      var didMove = false;
      var iterator = this.clone();
      var currentPosition = this.getCursorPosition();

      var bestMatch = iterator.clone();

      // instead of having two functions (one that moves forwards towards the point
      // and one that moves backwards towards the point), determine which direction
      // we have to move, and assign a function that moves the iterator in that
      // direction
      var distanceToDesired = currentPosition.left - x;
      var areWeCurrentlyAfterTheDesiredLocation = distanceToDesired > 0;

      // we could already be as close as we're going to get
      var bestDistance = Math.abs(distanceToDesired);

      // yeah, we're already there!
      if (distanceToDesired === 0) {
        return false;
      }

      var iterate: { (iter: DocumentCursor): boolean };

      if (areWeCurrentlyAfterTheDesiredLocation) {
        iterate = (iter: DocumentCursor) => iter.moveBackwardInBlock();
      } else {
        iterate = (iter: DocumentCursor) => iter.moveForwardInBlock();
      }

      while (iterate(iterator)) {
        var loc = iterator.getCursorPosition();

        // oops, we went too far back
        if (!loc.isInlineWith(currentPosition)) {
          break;
        }

        didMove = true;
        var distance = loc.distanceTo(x);

        if (distance < bestDistance) {
          bestMatch = iterator.clone();
          bestDistance = iterator.getCursorPosition().distanceTo(x);
        }
      }

      if (!didMove) {
        return false;
      }

      this.cloneFrom(bestMatch);
      return true;
    }

    public removeNextInBlock(): boolean {
      var next = this.nextNode;
      var span = <HTMLSpanElement>next.parentNode;
      span.removeChild(next);
      return true;
    }

    /**
     * Move the cursor using the given state object, moving towards a given point,
     * towards the beginning of the line, or towards the end of the line.
     */
    private moveUsingState(state: CursorNavigationState) {
      if (state === CursorNavigationState.beginningOfLine) {
        this.moveToBeginningOfLine();
      } else if (state === CursorNavigationState.endOfLine) {
        this.moveToEndOfLine();
      } else {
        this.moveTowards(state.x);
      }
    }
  }

  /**
   * Determines how the cursor should be moved, when moving upwards or downwards
   */ /**
   * Represents a point where a cursor can exist
   */
}