module TextRight.Editor.Internal {
  import StringUtils = TextRight.Utils.StringUtils;

  export interface IInputHandler {
    handleTextAddition(text: string);
    moveUp();
    moveDown();
    navigateLeft();
    navigateRight();
    handleBackspace();
    handleDelete();
    handleEnter();
    handleEnd();
    handleHome();
    navigateBlockUp();
    navigateBlockDown();
    navigateWordLeft();
    navigateWordRight();
  }

  export class TextInputProcessor {
    /**
   * The input the last time we queried the element.
   */
    private lastInput = "";

    private isPasteIncoming = false;
    private isCutIncoming = false;

    constructor(private element: HTMLTextAreaElement,private handler: IInputHandler) {
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

    /**
     * Is only the CTRL key held down for the given keyboard event
     */
    private isControlOnly(evt: KeyboardEvent) {
      return evt.ctrlKey
        && !evt.shiftKey
        && !evt.altKey
        && !evt.metaKey;
    }

    /** Handle the case where the user pressed a key down. */
    private handleKeyDown(evt: KeyboardEvent) {
      switch (evt.keyCode) {
        case KeyboardConstants.left:
          if (this.isControlOnly(evt)) {
            this.handler.navigateWordLeft();
          } else {
            this.handler.navigateLeft();
          }
          evt.preventDefault();
          break;
        case KeyboardConstants.right:
          if (this.isControlOnly(evt)) {
            this.handler.navigateWordRight();
          } else {
            this.handler.navigateRight();
          }
          evt.preventDefault();
          break;
        case KeyboardConstants.up:
          if (this.isControlOnly(evt)) {
            this.handler.navigateBlockUp();
          } else {
            this.handler.moveUp();
          }
          evt.preventDefault();
          break;
        case KeyboardConstants.down:
          if (this.isControlOnly(evt)) {
            this.handler.navigateBlockDown();
          } else {
            this.handler.moveDown();
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
          this.handler.handleEnd();
          evt.preventDefault();
          break;
        case KeyboardConstants.home:
          this.handler.handleHome();
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