module TextRight.Editor.Internal {
  import StringUtils = TextRight.Utils.StringUtils;

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

    /** Text manipulation methods */
    handleTextAddition(text: string);
    handleBackspace();
    handleDelete();
    handleEnter();
  }

  export class TextInputProcessor {
    /**
   * The input the last time we queried the element.
   */
    private lastInput = "";

    private isPasteIncoming = false;
    private isCutIncoming = false;

    constructor(private element: HTMLTextAreaElement, private handler: IInputHandler) {
      if (element == null)
        throw "Not a valid element";

      element.addEventListener("keydown", evt => this.handleKeyDown(evt));
    }

    public readInput(): boolean {
      // TODO bail out fast if we're not focused
      // TODO handle PASTE incoming

      var text = this.element.value;
      var prevInput = this.lastInput;

      // If nothing changed, bail.
      if (text === prevInput && !this.isSomethingSelected())
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

    public isSomethingSelected(): boolean {
      return false;
    }

    private isShiftDown(evt: KeyboardEvent): boolean {
      return evt.shiftKey;
    }

    /** Check if the control key is down for the gi*/
    private isControlDown(evt: KeyboardEvent): boolean {
      return evt.ctrlKey;
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