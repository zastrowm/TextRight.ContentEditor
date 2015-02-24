module TextRight.Editor.Internal {
  import DebouncingTimer = TextRight.Utils.DebouncingTimer;
  import HtmlUtils = TextRight.Utils.HtmlUtils;

  /**
   * Handles the presentation/handling of the caret
   */
  export class CaretPresenter {

    private cursorElement: HTMLElement;
    private blinkTimer: DebouncingTimer;

    /**
     * @param documentElement the document for which the caret is being managed
     * @param inputTextArea the input area that should move along with the caret
     */
    constructor(documentElement: HTMLElement, private inputTextArea: HTMLTextAreaElement) {
      this.cursorElement = HtmlUtils.appendNewElement(documentElement, "DIV", ElementClasses.cursor);

      this.blinkTimer = new DebouncingTimer(500, () => this.toggleCursor());
    }

    /** Indicate that there is textual activity and so the caret should be solid. */
    public markTextActivity() {
      this.blinkTimer.trigger();
    }

    /**
     * Update the position of the caret
     */
    public updateCaretLocation(cursor: DocumentCursor) {
      // TODO split out the handling of shouldMaintainPreferredPosition and 
      // the actual refresh of the cursor location 
      var pos = cursor.getCursorPosition();

      var cssTop = pos.top + "px";
      var cssLeft = pos.left + "px";
      var height = pos.height + "px";

      this.cursorElement.style.top = cssTop;
      this.cursorElement.style.left = cssLeft;
      this.cursorElement.style.height = height;

      this.inputTextArea.style.top = cssTop;
      this.inputTextArea.style.left = cssLeft;
      this.inputTextArea.style.height = height;
    }

    /**
     * Toggle the cursor to be hidden or shown depending on its previous state
     */
    private toggleCursor() {
      var isHidden = this.cursorElement.style.display === "none";
      this.cursorElement.style.display = isHidden ? "block" : "none";
      this.blinkTimer.trigger();
    }
  }
}
 