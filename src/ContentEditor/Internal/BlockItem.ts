module TextRight.Editor.Internal {
  import HtmlUtils = TextRight.Utils.HtmlUtils; /** CSS classes to apply to various elements. */

  /**
   * Contains a block/paragraph item
   */
  export class BlockItem {

    /**
     * Wrap a block element for the document
     */
    constructor(public containerElement: HTMLElement) {
    }

    /**
     * Create a new block that can be inserted into he document
     */
    public static createNewBlock() {
      var newContainer = document.createElement("block");
      var newParagaph = document.createElement("p");
      newContainer.appendChild(newParagaph);

      var firstChild = document.createElement("span");
      firstChild.classList.add(ElementClasses.firstChildElement);
      firstChild.innerHTML = "&#8203;";

      var lastChild = document.createElement("span");
      lastChild.classList.add(ElementClasses.lastChildElement);
      firstChild.innerHTML = "&#8203;";

      var firstSpan = document.createElement("span");

      newParagaph.appendChild(firstChild);
      newParagaph.appendChild(firstSpan);
      newParagaph.appendChild(lastChild);

      return new BlockItem(newContainer);
    }

    /**
     * The paragraph element associated with this block
     */
    public get contentElement(): HTMLParagraphElement {
      return <HTMLParagraphElement>this.containerElement.firstChild;;
    }

    /** Returns true if the block has no content. */
    public get isEmpty(): boolean {
      // get the first span and check if it has children
      return !this.firstContentSpan.hasChildNodes();
    }

    /** Returns true if the block is the first block in the document. */
    public get isBeginningOfDocument(): boolean {
      return this.previousContainer.classList.contains(ElementClasses.firstBlock);
    }

    /** Returns true if the block is the last block in the document. */
    public get isEndOfDocument(): boolean {
      return this.nextContainer.classList.contains(ElementClasses.lastBlock);
    }

    /* Gets the next container element to this block*/
    public get nextContainer(): HTMLDivElement {
      return <HTMLDivElement>this.containerElement.nextElementSibling;
    }

    /* Gets the previous container element to this block*/
    public get previousContainer(): HTMLDivElement {
      return <HTMLDivElement>this.containerElement.previousElementSibling;
    }


    public get nextBlock(): BlockItem {
      // TODO handle parent/children blocks
      return new BlockItem(this.nextContainer);
    }

    public get previousBlock(): BlockItem {
      // TODO handle parent/children blocks
      return new BlockItem(this.previousContainer);
    }

    /**
     * Get the first span that represents content of this block
     */
    public get firstContentSpan(): HTMLSpanElement {
      return <HTMLSpanElement>this.contentElement.firstElementChild.nextElementSibling;
    }

    /**
     * Get the last span that represents content of this block
     */
    public get lastContentSpan(): HTMLSpanElement {
      return <HTMLSpanElement>this.contentElement.lastElementChild.previousElementSibling;
    }

     /**
     * Retrieves a document cursor which represents the end of this block.
     * @return A DocumentCursor representing the end of this block.
     */
    public get end(): DocumentCursor {
      var cursor = new DocumentCursor(null, null, null);
      cursor.moveToEndOf(this);
      return cursor;
    }

    /**
     * Retrieves a document cursor which represents the beginning of this block.
     * @return A DocumentCursor representing the beginning of this block.
     */
    public get beginning(): DocumentCursor {
      var cursor = new DocumentCursor(null, null, null);
      cursor.moveToBeginningOf(this);
      return cursor;
    }
  }
}