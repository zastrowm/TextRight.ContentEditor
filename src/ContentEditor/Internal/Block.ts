module TextRight.Editor.Internal {
  import HtmlUtils = TextRight.Utils.HtmlUtils;

  /**
   * Wrapper around an element that represents a single block (paragraph, list, quote) 
   * inside of a document.  Should not be constructed as when we use a block we are
   * really just operating on an HTMLElement; class is only for grouping of functionality
   * and type safety
   */
  export class Block {

    // only used to make sure that nothing else is compatible with this "class"
    public __class__Block__ : number;

    /**
     * Do not use
     */
    constructor() {
      throw "Cannot create instance of a block. Placeholder type only.";
    }

     /**
     * Create a new block that can be inserted into the document
     */
    public static createNewBlock(): Block {
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

      return Block.fromContainer(newContainer);
    }


    /**
     * Check if the given element represents a block
     */
    public static isBlock(element: Element): boolean {
      return element.nodeName === "BLOCK";
    }

    /**
     * Check if the given element represents the content of a block (aka the
     * paragraph in the block)
     */
    public static isBlockContent(element: Element): boolean {
      if (element.nodeName !== "P")
        return false;

      return this.isBlock(<Element>element.parentNode);
    }

    /**
     * Check if the given element represents a span within a block
     */
    public static isSpan(element: Element): boolean {
      // TODO not all spans are spans within a block
      return element.nodeName === "SPAN";
    }

    /**
     * Get a block item that represents the block that the given span is contained within
     */
    public static blockFromSpan(element: Element): Block {
      // TODO more error checking
      return Block.fromContainer(<HTMLElement>element.parentNode.parentNode);
    }

    /** Returns true if the block is the first block in the document. */
    public static isBeginningOfDocument(block: Block): boolean {
      return Block.getPreviousContainer(block).classList.contains(ElementClasses.firstBlock);
    }

    /** Returns true if the block is the last block in the document. */
    public static isEndOfDocument(block: Block): boolean {
      return Block.getNextContainer(block).classList.contains(ElementClasses.lastBlock);
    }

    /** Convert this block into a container */
    public static getContainerElement(block: Block): HTMLElement {
      return <HTMLElement><any>block;
    }

    /** Convert this block from a container */
    public static fromContainer(container: HTMLElement): Block {
      return <Block><any>container;
    }

    /** Get the paragraph element that actually contains the spans for the block */
    public static getContentElement(block: Block): HTMLElement {
      return (<HTMLElement><any>block).firstElementChild;
    }

    /**
     * Get the first span that represents content of this block
     */
    public static getfirstContentSpan(block: Block): HTMLSpanElement {
      return <HTMLSpanElement>(<HTMLDivElement><any>block).firstElementChild.firstElementChild.nextElementSibling;
    }

    /**
    * Get the last span that represents content of this block
    */
    public static getlastContentSpan(block: Block): HTMLSpanElement {
      return <HTMLSpanElement>(<HTMLDivElement><any>block).firstElementChild.lastElementChild.previousElementSibling;
    }

    /** Returns true if the block has no content. */
    public static isEmpty(block: Block): boolean {
      // get the first span and check if it has children
      return !Block.getfirstContentSpan(block).hasChildNodes();
    }

    /* Gets the next container element to this block*/
    public static getNextContainer(block: Block): HTMLDivElement {
      return <HTMLDivElement>(<HTMLDivElement><any>block).nextElementSibling;
    }

    /* Gets the previous container element to this block*/
    public static getPreviousContainer(block: Block): HTMLDivElement {
      return <HTMLDivElement>(<HTMLDivElement><any>block).previousElementSibling;
    }

    /** Gets the next sibling block of the given block */
    public static getNextBlock(block: Block): Block {
      // TODO handle parent/children blocks
      return <Block><any>Block.getNextContainer(block);
    }

    /** Gets the previous sibling block of the given block */
    public static getPreviousBlock(block: Block): Block {
      // TODO handle parent/children blocks
      return <Block><any>Block.getPreviousContainer(block);
    }

    /**
     * Retrieves a document cursor which represents the end of this block.
     * @return A DocumentCursor representing the end of this block.
     */
    public static getEnd(documentModel: DocumentModel, block: Block): DocumentCursor {
      var cursor = new DocumentCursor(documentModel, null, null, null);
      cursor.moveToEndOf(block);
      return cursor;
    }

    /**
     * Retrieves a document cursor which represents the beginning of this block.
     * @return A DocumentCursor representing the beginning of this block.
     */
    public static getBeginning(documentModel: DocumentModel,block: Block): DocumentCursor {
      var cursor = new DocumentCursor(documentModel, null, null, null);
      cursor.moveToBeginningOf(block);
      return cursor;
    }
  }
}