﻿module TextRight.Editor.Internal {
  import HtmlUtils = TextRight.Utils.HtmlUtils;
  import MathUtils = TextRight.Utils.MathUtils;

  export class DocumentModel {
    private rawFirstBlock: BlockItem;
    private undoStack: UndoStack;

    /**
     * Create a new editable document from a div element
     * @note all children of the element will be removed/replace to make
     * an editable document.
     * @param {HTMLDivElement} element The element to make a document out of.
     * @return A block representing the beginning of the document.
     */
    constructor(private element: HTMLDivElement) {
      this.rawFirstBlock = EditDocument.intialize(element);
      this.undoStack = new UndoStack();
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
    public get firstBlock() {
      return this.rawFirstBlock;
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
        var contentRect = block.containerElement.getBoundingClientRect();

        x = MathUtils.clamp(x, contentRect.left, contentRect.right);
        y = MathUtils.clamp(y, contentRect.top, contentRect.bottom);

        // TODO optimize so that we don't go through EVERY span and so that
        // if we're towards the end, we start from the beginning
        var cursor = block.beginning;
        cursor.moveTowardsPosition(x, y);
        return cursor;
      } else {
        // TODO
      }

      return null;
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