module TextRight.Editor.Internal {
  import HtmlUtils = TextRight.Utils.HtmlUtils;
  import MathUtils = TextRight.Utils.MathUtils;

  var carriageReturn = "\r";
  var newline = "\n";

  export class DocumentModel {
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

      this.insertBlockAfter(first, block);
      this.insertText(block.beginning, text);
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

      if (BlockItem.isSpan(element)) {
        
        // search through to find the span
        var position = new DocumentCursor(
          BlockItem.blockFromSpan(element),
          <HTMLSpanElement>element,
          element.firstChild);
        position.moveTowardsPosition(x, y);

        return position;
      } else if (BlockItem.isBlock(element) || BlockItem.isBlockContent(element)) {

        var blockElement = BlockItem.isBlock(element)
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
     * Inserts text at the cursor location.
     * @param {DocumentCursor} cursor The location at which the text should be inserted.
     * @param {string} text The text that should be inserted into the document.
     * @return a cursor representing the end of the content.
     *
     * @remarks Blocks will automatically be created if newlines are contained within
     *                 the text.  if this is not desired, remove newlines from the given text.
     */
    public insertText(cursor: DocumentCursor, text: string): DocumentCursor {

      // TODO fix and try to actually implement this
      if (cursor != null) {
        return this.insertTextAtCursor(cursor, text);
      }

      // TODO check if we already inserted text elsewhere
      // TODO handle newlines

      return this.insertTextAtCursor(cursor, text);
    }

   
    private insertTextAtCursor(cursor: DocumentCursor, text: string): DocumentCursor {
      cursor = cursor.clone();
      var fragment = document.createDocumentFragment();
      var fragments: DocumentFragment[] = [fragment];

      text.split("").forEach(part => {
        if (part === carriageReturn)
          return;

        if (part === newline) {
          fragment = document.createDocumentFragment();
          fragments.push(fragment);
          return;
        }

        var span = document.createTextNode(part);
        fragment.appendChild(span);
      });

      // insert the current text
      this.addElementsToCursorAndAdvance(cursor, fragments[0]);

      // if there are more fragments, that means that we had newlines.  So add a bunch of
      // paragraphs and continue adding content to them
      for (var i = 1; i < fragments.length; i++) {
        this.splitBlock(cursor);
        cursor.moveForward();
        this.addElementsToCursorAndAdvance(cursor, fragments[i]);
      }

      return cursor;
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
     * Split the block pointed at by cursor into two blocks.  The content before the cursor
     * will be its own block and the content after the cursor will be its own block.
     *
     * @note The cursor will be updated to point to the end of the block that contains the
     * content before the cursor.
     * @param {DocumentCursor} cursor The cursor whose position determines the split point.
     */
    public splitBlock(cursor: DocumentCursor): void {
      var newBlock = BlockItem.createNewBlock();

      // simple: add a blank paragraph before
      if (cursor.isBeginningOfBlock) {
        // We're at the beginning of the block, so let's make this simple and just add a
        // blank paragraph before the current block.
        this.insertBlockBefore(cursor.block, newBlock);
        // don't forget to fix up the cursor to point to the end of the "new content" which is
        // just the blank paragraph
        cursor.moveToEndOf(newBlock);
        return;
      }

      // simple: add a blank paragraph after
      if (cursor.isEndOfBlock) {
        this.insertBlockAfter(cursor.block, newBlock);
        return;
      }

      // complex: need to extract the contents from inside the block

      var range = document.createRange();

      // If we're at the end of a span, its better to start the selection by selecting the
      // entirety of the next span, otherwise we'll end up with an empty span, which we do
      // not allow.  If we're not at the end of a span, it means we're in the middle of one
      // so just start the selection and the current text node and let the
      // Range.extractContents() do the magic of extracting the correct hierarchy of
      // elements.
      var startSelection = cursor.isEndOfSpan
        ? cursor.spanElement.nextSibling
        : cursor.nextNode;

      range.setStartBefore(startSelection);
      range.setEndAfter(cursor.block.lastContentSpan);

      var contentOfNewBlock = range.extractContents();
      this.appendToBlock(newBlock, contentOfNewBlock);
      this.insertBlockAfter(cursor.block, newBlock);

      range.detach();

      // potentially, the text node that we once held in the cursor is no longer in the same
      // span, so be sure to fix it up before returning
      if (cursor.textNode != null) {
        cursor.setTo(cursor.block, <HTMLSpanElement>cursor.textNode.parentNode, cursor.textNode);
      }
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

    /**
      * Add elements to the position pointed to by cursor, and move the cursor forward so
      * that it points after the newly inserted content.
      */
    private addElementsToCursorAndAdvance(cursor: DocumentCursor, fragment: DocumentFragment): void {
      // TODO, remove cursor if possible
      var clone = cursor.clone();
      var isAtEnd = !clone.moveForwardInBlock();

      cursor.add(fragment);

      if (isAtEnd) {
        cursor.moveToEndOf(cursor.block);
      } else {
        clone.moveBackwards();
        cursor.cloneFrom(clone);
      }
    }

    /**
     * Insert a block following the current block.
     * @param {BlockItem} currentBlock  The block that becomes the previous sibling to the inserted
     *                                  block.
     * @param {BlockItem} newBlock The new block inserted after currentBlock.
     */
    private insertBlockAfter(currentBlock: BlockItem, newBlock: BlockItem): void {
      if (currentBlock == null)
        throw "currentBlock cannot be null";
      if (newBlock == null)
        throw "newBlock cannot be null";

      currentBlock.containerElement.parentElement.insertBefore(newBlock.containerElement, currentBlock.nextContainer);
    }

    /**
     * Insert a block before the current block.
     *
     * @note simple method but implemented for readability
     */
    private insertBlockBefore(blockItem: BlockItem, newBlock: BlockItem) {
      blockItem.containerElement.parentElement.insertBefore(newBlock.containerElement, blockItem.containerElement);
    }


  }
}