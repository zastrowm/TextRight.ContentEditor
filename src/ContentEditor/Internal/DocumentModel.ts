module TextRight.Editor.Internal {
  import HtmlUtils = TextRight.Utils.HtmlUtils;
  import MathUtils = TextRight.Utils.MathUtils;

  export class DocumentModel {
    private undoStack: UndoStack;

    private firstBlockIndicator: HTMLElement;
    private lastBlockIndicator: HTMLElement;

    /**
     * Create a new editable document from a div element
     * @note all children of the element will be removed/replace to make
     * an editable document.
     * @param {HTMLDivElement} element The element to make a document out of.
     * @return A block representing the beginning of the document.
     */
    constructor(private element: HTMLDivElement) {

      // we're gonna put the text back later
      var text = element.textContent;

      // make sure the element is empty
      HtmlUtils.clearChildren(element);

      this.firstBlockIndicator = HtmlUtils.appendNewElement(element, "div", ElementClasses.firstBlock);
      this.lastBlockIndicator = HtmlUtils.appendNewElement(element, "div", ElementClasses.lastBlock);

      // fake block to insert the first block
      var first = new BlockItem(<HTMLDivElement>element.children[0]);

      var block = BlockItem.createNewBlock();

      EditDocument.insertBlockAfter(first, block);
      EditDocument.insertText(block.beginning, text);

      this.undoStack = new UndoStack();
    }

    /**
     * Get the offset between getBoundingClientRect() and the top of the element.  This is
     * used primarily for anything that calls getBoundingClientRect() and needs to position
     * things accordingly. getBoundingClientRect() returns client coordinates while
     * absolutely positioned items need page offset.  So by adding the offset acquired by
     * this method, you can translate your client rect to a page rect.
     * @return The offset between client coordinates and page coordinates.
     */
    public getOffset(): { left: number; top: number } {
      var doc = this.element;
      var client = doc.getBoundingClientRect();
      var diffTop = doc.offsetTop - client.top;
      var diffLeft = doc.offsetLeft - client.left;

      return {
        left: diffLeft,
        top: diffTop
      };
    }

    /**
     * The html div element that represents the top-level document container
     */
    public get rawElement(): HTMLDivElement {
      return this.element;
    }

    /**
     * The first block item in the document
     */
    public get firstBlock(): BlockItem {
      return new BlockItem(this.firstBlockIndicator.nextElementSibling);
    }

    /**
     * The last block item in the document
     */
    public get lastBlock(): BlockItem {
      return new BlockItem(this.lastBlockIndicator.previousElementSibling);
    }

    /**
     * Check if the given x/y coordinates are part of this document
     */
    public isCoordinatesInsideDocument(x: number, y: number) {
      var rect = this.element.getBoundingClientRect();

      return x >= rect.left
        && x <= rect.right
        && y >= rect.top
        && y <= rect.bottom;
    }

    /**
     * Gets a cursor that represents the given x/y coordinates for this document
     */
    public getCursorFromLocation(x: number, y: number): DocumentCursor {
      var rect = this.element.getBoundingClientRect();

      // clamp it inside the document bounds... 
      x = MathUtils.clamp(x, rect.left, rect.right);
      y = MathUtils.clamp(y, rect.top, rect.bottom);

      var element = document.elementFromPoint(x, y);

      if (EditDocument.isSpan(element)) {
        
        // search through to find the span
        var position = new DocumentCursor(
          EditDocument.blockFromSpan(element),
          <HTMLSpanElement>element,
          element.firstChild);
        position.moveTowardsPosition(x, y);

        return position;
      } else if (EditDocument.isBlock(element) || EditDocument.isBlockContent(element)) {

        var blockElement = EditDocument.isBlock(element)
          ? element
          : <Element>element.parentNode;

        var block = new BlockItem(<HTMLElement>blockElement);
        return this.getCursorForPositionForBlock(x, y, block);
      } else {

        var firstBlock = this.firstBlock;

        var beginPosition = this.firstBlock.containerElement.getBoundingClientRect().top;
        var endPosition = this.lastBlock.containerElement.getBoundingClientRect().bottom;

        if (y < beginPosition) {
          return this.getCursorForPositionForBlock(x, y, this.firstBlock);
        } else if (y >= endPosition) {
          return this.getCursorForPositionForBlock(x, y, this.lastBlock);
        } else {
          console.error("{A91266BD-CFD1-4C8F-AE57-76FBBD9613F6}", element, x, y);
        }
      }

      return null;
    }

    /**
     * Get a cursor that represents a location close to the given x/y value within the block
     */
    private getCursorForPositionForBlock(x: number, y: number, block: BlockItem) {
      var contentRect = block.containerElement.getBoundingClientRect();

      x = MathUtils.clamp(x, contentRect.left, contentRect.right);
      y = MathUtils.clamp(y, contentRect.top, contentRect.bottom);

      // TODO optimize so that we don't go through EVERY span and so that
      // if we're towards the end, we start from the beginning
      var cursor = block.beginning;
      cursor.moveTowardsPosition(x, y);
      return cursor;
    }

    /**
     * Insert text into the document at the specified location
     */
    public insertText(cursor: DocumentCursor, text: string): DocumentCursor {

      // TODO fix and try to actually implement this
      if (cursor != null) {
        return EditDocument.insertText(cursor, text);
      }

      // TODO check if we already inserted text elsewhere
      // TODO handle newlines

      var event = new InsertTextEvent();
      event.timeStart = DateUtils.timestamp;
      event.timeEnd = DateUtils.timestamp;
      event.text = text;

      return EditDocument.insertText(cursor, text);
    }

    /**
     * Removes the content between start and end
     * @param {DocumentCursor} start the start of the content to remove
     * @param {DocumentCursor} end the end of the content to remove
     * @return a location representing the resulting location of the cursor
     */
    public removeBetween(start: DocumentCursor, end: DocumentCursor): DocumentCursor {
      // TODO implement
      return null;
    }

    /**
     * Merge the contents of two blocks.
     * @param {BlockItem} mergeInto The block to merge the blockToMerge into.
     * @param {BlockItem} blockToMerge The block to merge into mergeInto.
     * @return A DocumentCursor pointing to what used to be the beginning of mergeInto block.
     */
    public mergeBlocks(mergeInto: BlockItem, blockToMerge: BlockItem): DocumentCursor {
      if (blockToMerge.isEmpty) {
        // we're merging in an empty block, so just remove the block
        this.removeBlock(blockToMerge);
        return mergeInto.end;
      }

      var wasMergeIntoBlockEmpty = mergeInto.isEmpty;
      var oldContent = this.removeBlock(blockToMerge);

      if (wasMergeIntoBlockEmpty) {
        this.appendToBlock(mergeInto, oldContent);
        return mergeInto.beginning;
      }

      var newCursor = mergeInto.end;
      newCursor.moveBackwardInBlock();
      this.appendToBlock(mergeInto, oldContent);
      newCursor.moveForward();
      return newCursor;
    }

    /**
     * Add the given fragment to the end of the given block
     * @param block the block to which to append content
     * @param fragment the fragment to append
     */
    private appendToBlock(block: BlockItem, fragment: DocumentFragment) {
      var lastContent = block.lastContentSpan;

      // we CANNOT allow empty spans, so remove the existing empty span if it exists
      if (block.isEmpty) {
        block.contentElement.removeChild(block.firstContentSpan);
      }

      block.contentElement.insertBefore(fragment, block.contentElement.lastElementChild);

      var nextSpan = lastContent.nextElementSibling;

      // Note don't worry if we removed this element, that just means nextElementSibiling
      // will be null.
      if (nextSpan != null && lastContent.className === nextSpan.className) {
        // the spans have the same "style" so combine them
        lastContent.appendChild(HtmlUtils.convertToFragment(nextSpan));
        // the element is now empty so we remove it
        nextSpan.parentElement.removeChild(nextSpan);
      }
    }

    /**
     * Removes the block from the document, returning the content (without indicators) of
     * the block.
     */
    private removeBlock(blockToRemove: BlockItem): DocumentFragment {
      var fragment = HtmlUtils.convertToFragment(blockToRemove.contentElement);
      fragment.removeChild(fragment.firstChild);
      fragment.removeChild(fragment.lastChild);

      HtmlUtils.removeElement(blockToRemove.containerElement);

      return fragment;
    }
  }



  class UndoStackNode {
    constructor(public event: UndoEvent, public previous: UndoEvent) {
    }
  }

  export class UndoStack {
    private last: UndoStackNode;

    constructor() {
    }

    public get isEmpty() {
      return this.last == null;
    }

    public push(event: UndoEvent): void {
      this.last = new UndoStackNode(this.last, event);
    }

    public peek(): UndoEvent {
      return this.last.event;
    }
  }

  export class DateUtils {
    public static get timestamp(): number {
      return Date.now();
    }
  }

  export class UndoEvent {
  }

  class InsertTextEvent {
    public timeStart: number;
    public timeEnd: number;

    public blockId: number;
    public charId: number;

    public text: string;
  }

  /**
   * Indicates the number of times something has changed.
   */
  export class ChangeCount {
    private value: number;

    constructor() {
      this.value = 0;
    }

    public get current(): number {
      return this.value;
    }

    public increment(): number {
      this.value++;
      return this.value;
    }
  }
}