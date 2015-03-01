module TextRight.Editor.Internal {
  import StringUtils = TextRight.Utils.StringUtils;
  import EventHandlers = TextRight.Internal.EventHandlers;
  import IEventHandler = TextRight.Internal.IEventHandler;

  export interface IInputHandler {

    /** selection/insertion management */
    moveUp(shouldExtendSelection: boolean);
    moveDown(shouldExtendSelection: boolean);
    navigateLeft(shouldExtendSelection: boolean);
    navigateRight(shouldExtendSelection: boolean);
    handleEnd(shouldExtendSelection: boolean);
    handleHome(shouldExtendSelection: boolean);
    navigateBlockUp(shouldExtendSelection: boolean);
    navigateBlockDown(shouldExtendSelection: boolean);
    navigateWordLeft(shouldExtendSelection: boolean);
    navigateWordRight(shouldExtendSelection: boolean);

    /* Selection manipulation methods */

    /**
     * Sets the current location of the caret.
     * @param {number} x The x screen-coordinate of where the caret should be placed.
     * @param {number} y The y screen-coordinate of where the caret should be placed.
     * @param {boolean} shouldExtendSelection true if current text selection should continue
     *                                        to the current location, false if it should
     *                                        simply be moved to the designated location.
     */
    setCaret(x: number, y: number, shouldExtendSelection: boolean): void;

    /* Text manipulation methods */
    handleTextAddition(text: string);
    handleBackspace();
    handleDelete();
    handleEnter();
  }

  /**
   * Processes key and mouse events, forwarding various events to the provided
   * handler
   */
  export class DocumentInputProcessor {
    /**
     * The input the last time we queried the element.
     */
    private lastInput = "";

    private isPasteIncoming = false;
    private isCutIncoming = false;

    private mouseDown: IEventHandler;
    private mouseMove: IEventHandler;
    private mouseUp: IEventHandler;

    constructor(
      private documentElement,
      private element: HTMLTextAreaElement,
      private handler: IInputHandler) {

      if (element == null)
        throw "Not a valid element";

      this.mouseDown = EventHandlers.from(
        documentElement,
        "mousedown",
        evt => this.handleMouseDown(evt),
        true);

      this.mouseMove = EventHandlers.from(
        documentElement,
        "mousemove",
        evt => this.handleMouseMove(evt));

      this.mouseUp = EventHandlers.fromMany(
        [documentElement, window],
        "mouseup",
        evt => this.handleMouseUp(evt));

      EventHandlers.from(element, "keydown", evt => this.handleKeyDown(evt), true);

      // TODO reduce interval when we can (exponential back off?)
      setInterval(() => this.readInput(), 50);
    }

    public readInput(): boolean {
      // TODO bail out fast if we're not focused
      // TODO handle PASTE incoming

      var text = this.element.value;
      var prevInput = this.lastInput;

      // If nothing changed, bail.
      if (text === prevInput)
        return false;

      // ::::::::CODEMIRROR::::::::
      //  if (text.charCodeAt(0) == 0x200b && doc.sel == cm.display.selForContextMenu && !prevInput)
      //      prevInput = "\u200b";

      var same = 0;
      var length = Math.min(prevInput.length, text.length);

      while (same < length && prevInput.charCodeAt(same) === text.charCodeAt(same)) {
        ++same;
      }

      var inserted = text.slice(same);
      var textLines = StringUtils.splitLines(inserted);

      if (same < prevInput.length) {
        // handle deletion
        // how did we get here?  Maybe selection deletion?
        debugger;
      } else {
        this.handler.handleTextAddition(inserted);
      }

      // Don't leave long text in the textarea, since it makes further polling slow
      if (text.length > 5 || text.indexOf("\n") > -1) {
        this.element.value = "";
        this.lastInput = "";
      } else {
        this.lastInput = text;
      }

      this.isPasteIncoming = false;
      this.isCutIncoming = false;

      return true;
    }

    /* Handle the case where the user is selecting text */
    private handleMouseDown(evt: MouseEvent) {
      if (evt.button !== 0)
        return;

      evt.preventDefault();
      var shouldExtendSelections = evt.shiftKey;

      this.handler.setCaret(evt.clientX, evt.clientY, shouldExtendSelections);

      this.mouseMove.enable();
      this.mouseUp.enable();
    }

    /* Handle the case where the user is selecting text */
    private handleMouseMove(evt: MouseEvent) {
      if (evt.button !== 0)
        return;

      evt.preventDefault();

      this.handler.setCaret(evt.clientX, evt.clientY, true);
    }

    /* Handle the case where the user stopped the selection */
    private handleMouseUp(evt: MouseEvent) {
      if (evt.button !== 0)
        return;

      evt.preventDefault();

      this.mouseMove.disable();
      this.mouseUp.disable();
    }

    /** Handle the case where the user pressed a key down. */
    private handleKeyDown(evt: KeyboardEvent) {

      var isCtrlDown = evt.ctrlKey;
      var shouldExtendSelections = evt.shiftKey;

      switch (evt.keyCode) {
        case KeyboardConstants.left:
          if (isCtrlDown) {
            this.handler.navigateWordLeft(shouldExtendSelections);
          } else {
            this.handler.navigateLeft(shouldExtendSelections);
          }
          evt.preventDefault();
          break;
        case KeyboardConstants.right:
          if (isCtrlDown) {
            this.handler.navigateWordRight(shouldExtendSelections);
          } else {
            this.handler.navigateRight(shouldExtendSelections);
          }
          evt.preventDefault();
          break;
        case KeyboardConstants.up:
          if (isCtrlDown) {
            this.handler.navigateBlockUp(shouldExtendSelections);
          } else {
            this.handler.moveUp(shouldExtendSelections);
          }
          evt.preventDefault();
          break;
        case KeyboardConstants.down:
          if (isCtrlDown) {
            this.handler.navigateBlockDown(shouldExtendSelections);
          } else {
            this.handler.moveDown(shouldExtendSelections);
          }
          evt.preventDefault();
          break;
        case KeyboardConstants.backspace:
          this.handler.handleBackspace();
          evt.preventDefault();
          break;
        case KeyboardConstants.deleteKey:
          this.handler.handleDelete();
          evt.preventDefault();
          break;
        case KeyboardConstants.enter:
          this.handler.handleEnter();
          evt.preventDefault();
          break;
        case KeyboardConstants.end:
          this.handler.handleEnd(shouldExtendSelections);
          evt.preventDefault();
          break;
        case KeyboardConstants.home:
          this.handler.handleHome(shouldExtendSelections);
          evt.preventDefault();
          break;
      }
    }
  }

  export class KeyboardConstants {
    public static backspace = 8;
    public static deleteKey = 46;
    public static left = 37;
    public static up = 38;
    public static right = 39;
    public static down = 40;
    public static enter = 13;
    public static end = 35;
    public static home = 36;
  }
}