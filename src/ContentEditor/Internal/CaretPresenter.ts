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
     * @param documentModel the model for which the caret is being managed
     * @param inputTextArea the input area that should move along with the caret
     */
    constructor(private documentModel: DocumentModel,private inputTextArea: HTMLTextAreaElement) {
      this.cursorElement = HtmlUtils.appendNewElement(documentModel.rawElement, "DIV", ElementClasses.cursor);

      this.blinkTimer = new DebouncingTimer(500, () => this.toggleCursor());
    }

    /** Indicate that there is textual activity and so the caret should be solid. */
    public markTextActivity() {
      this.cursorElement.style.display = "block";
      this.blinkTimer.trigger();
    }

    /**
     * Update the position of the caret
     */
    public updateCaretLocation(cursor: DocumentCursor) {
      
      var pos = cursor.getCursorPosition();

      HtmlUtils.positionElement(this.cursorElement, pos.top, pos.left, pos.height, 1);
      HtmlUtils.positionElement(this.inputTextArea, pos.top + 5, pos.left - 5, pos.height, 1);
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
 