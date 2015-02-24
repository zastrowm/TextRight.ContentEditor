module TextRight.Editor.Internal {
  import DebouncingTimer = TextRight.Utils.DebouncingTimer;
  import CharacterCategorizer = TextRight.Internal.CharacterCategorizer
  import HtmlUtils = TextRight.Utils.HtmlUtils;

  /**
   * Wraps an element and allows editing, providing a cursor and handling
   * operations that modify the text within the element.
   */
  export class DocumentView implements IInputHandler {
    private inputTextArea: HTMLTextAreaElement;

    private characterCategorizer: CharacterCategorizer;

    private documentModel: DocumentModel;

    /** The state to use when moving up or down */
    private movementState: CursorNavigationState = null;

    /** Where the current selection starts. */
    private selectionStart: DocumentCursor;

    /** Where the current selection ends.  Also used as the insertion point when we don't have a selection. */
    private cursorLocation: DocumentCursor;

    /** Handles the display of the current selection */
    private selectionPresenter: SelectionPresenter;

    /** Handles the display of the caret (including its blinking) */
    private caretPresenter: CaretPresenter;

    /**
     * Create a new DocumentView that handles the given div as an editable document
     */
    constructor(private element: HTMLDivElement) {
      this.characterCategorizer = CharacterCategorizer.instance;

      this.documentModel = new DocumentModel(element);
      this.cursorLocation = this.documentModel.firstBlock.beginning;
      this.selectionStart = this.documentModel.firstBlock.beginning;

      this.initializeTextArea();

      this.caretPresenter = new CaretPresenter(element, this.inputTextArea);
      this.selectionPresenter = new TextRight.Editor.Internal.SelectionPresenter(element);

      this.markTyping();
      this.redrawCaretAndSelection();

      element.addEventListener('resize', () => this.handleResize());
      window.addEventListener('resize', () => this.handleResize());

      var inputProcessor = new DocumentInputProcessor(this.element, this.inputTextArea, this);
    }

    /** true if there is currently a selection. */
    private get hasSelection(): boolean {
      return this.selectionStart != null;
    }

    private initializeTextArea(): void {
      this.inputTextArea = document.createElement("textarea");
      this.inputTextArea.classList.add(ElementClasses.textareaInput);
      this.element.appendChild(this.inputTextArea);
    }

    private markTyping() {
      this.caretPresenter.markTextActivity();
    }

    public focus(): void {
      this.inputTextArea.focus();
    }

    public handleResize() {
      this.redrawCaretAndSelection();
    }

    /**
     * Handles the events that occur when the text input has changed.
     */
    public handleTextAddition(text: string) {
      this.cursorLocation = this.documentModel.insertText(this.cursorLocation, text);

      this.setSelectionMode(false);
      this.markCursorMovedWithoutState();
    }

    /**
     * Set whether or not the document is maintaining a text selection (shouldMaintainSelection=true)
     * or whether the document is simply displaying a cursor (shouldMaintainSelection=false)
     */
    private setSelectionMode(shouldMaintainSelection: boolean) {

      if (shouldMaintainSelection) {

        // selectionStart being null is the indicator that we don't have a selection
        if (this.selectionStart == null) {
          this.selectionStart = this.cursorLocation.clone();
        }

      } else {
        this.selectionStart = null;
      }
    }

    /**
     * Redraw the caret and current selection
     */
    private redrawCaretAndSelection() {
      this.caretPresenter.updateCaretLocation(this.cursorLocation);

      if (this.hasSelection) {
        this.selectionPresenter.update(this.selectionStart, this.cursorLocation);
      } else {
        this.selectionPresenter.disable();
      }
    }

    /**
     * Reset the movement state, redraw the caret and selection, and mark that we've been
     * typing. Used as a convenience method to cut down on repetitive code.  Usually invoked
     * from method that move the caret in a way that should cause the movement state to
     * reset (for instance left or right arrow keys).
     */
    private markCursorMovedWithoutState() {
      this.movementState = null;
      this.redrawCaretAndSelection();
      this.markTyping();
    }

    /**
     * Redraw the caret and selection, and mark that we've been typing. Used as a convenience
     * method to cut down on repetitive code.  Usually invoked from method that move the
     * caret in a way that should NOT cause the movement state to reset (for instance up or down
     * keys).
     */
    private markCursorMovedWithState() {
      this.redrawCaretAndSelection();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public handleLeftMouseDown(x: number, y: number, shouldExtendSelection: boolean) {
      this.inputTextArea.focus();

      this.setSelectionMode(shouldExtendSelection);
      this.moveCaretTo(x, y);
    }

    /* @inherit from IInputHandler */
    public handleLeftMouseMove(x: number, y: number) {
      this.inputTextArea.focus();

      this.setSelectionMode(true);
      this.moveCaretTo(x, y);
    }

    /** Move the caret to the designated point, if possible */
    private moveCaretTo(x: number, y: number) {
      var position = this.documentModel.getCursorFromLocation(x, y);

      if (position != null) {
        this.cursorLocation = position;
        this.markCursorMovedWithoutState();
      }
    }

    /* @inherit from IInputHandler */
    public moveUp(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.movementState == null) {
        this.movementState = CursorNavigationState.fromPosition(this.cursorLocation.getCursorPosition().left);
      }

      this.cursorLocation.moveUpwards(this.movementState);
      this.markCursorMovedWithState();
    }

    /* @inherit from IInputHandler */
    public moveDown(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.movementState == null) {
        this.movementState = CursorNavigationState.fromPosition(this.cursorLocation.getCursorPosition().left);
      }

      this.cursorLocation.moveDownwards(this.movementState);
      this.markCursorMovedWithState();
    }

    /* @inherit from IInputHandler */
    public navigateLeft(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.cursorLocation.moveBackwards();
      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public navigateRight(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.cursorLocation.moveForward();
      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public navigateWordLeft(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.cursorLocation.isBeginningOfBlock) {
        if (!this.cursorLocation.block.isBeginningOfDocument) {
          this.cursorLocation.moveToEndOf(this.cursorLocation.block.previousBlock);
        }
      } else {
        var cursor = this.cursorLocation;

        var category: number;

        // navigate backwards through all of the initial whitespace/undesirable characters
        // until we reach a non whitespace/undesirable.
        do {
          category = this.characterCategorizer.categorize(cursor.textNode.textContent);
        } while (category < 0 && cursor.moveBackwardInBlock() && !cursor.isBeginningOfBlock);

        var lastCategory: number;

        // now move backwards until we change categories
        do {
          lastCategory = category;

          // if we don't exit early, then textNode will be null
          if (!cursor.moveBackwardInBlock() || cursor.isBeginningOfBlock) {
            break;
          }

          var prevText = cursor.textNode.textContent;
          category = this.characterCategorizer.categorize(prevText);
        } while (lastCategory === category);
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public navigateWordRight(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.cursorLocation.isEndOfBlock) {
        if (!this.cursorLocation.block.isEndOfDocument) {
          this.cursorLocation.moveToBeginningOf(this.cursorLocation.block.nextBlock);
        }
      } else {
        var cursor = this.cursorLocation;

        var lastCategory: number;
        var category: number;

        category = this.characterCategorizer.categorize(cursor.nextNode.textContent);

        // navigate until we get to a character category that A) is different from the last
        // seen category and B) is not an Don't-Care-Category (AKA < 0)
        do {
          lastCategory = category;

          // if we don't exit early, then nextNode will be null
          if (!cursor.moveForwardInBlock() || cursor.isEndOfBlock) {
            break;
          }

          var nextText = cursor.nextNode.textContent;
          category = this.characterCategorizer.categorize(nextText);
        } while (lastCategory === category || category < 0);
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public navigateBlockUp(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (!this.cursorLocation.isBeginningOfBlock) {
        this.cursorLocation.moveToBeginningOf(this.cursorLocation.block);
      } else if (this.cursorLocation.isBeginningOfBlock) {
        if (!this.cursorLocation.block.isBeginningOfDocument) {
          this.cursorLocation.moveToBeginningOf(this.cursorLocation.block.previousBlock);
        }
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public navigateBlockDown(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (!this.cursorLocation.block.isEndOfDocument) {
        this.cursorLocation.moveToBeginningOf(this.cursorLocation.block.nextBlock);
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public handleEnd(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.movementState = CursorNavigationState.endOfLine;

      this.cursorLocation.moveToEndOfLine();
      this.markCursorMovedWithState();
    }

    /* @inherit from IInputHandler */
    public handleHome(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.movementState = CursorNavigationState.beginningOfLine;

      this.cursorLocation.moveToBeginningOfLine();
      this.markCursorMovedWithState();
    }

    /* @inherit from IInputHandler */
    public handleBackspace() {
      this.setSelectionMode(false);
      // todo handle selected text

      if (this.cursorLocation.isBeginningOfBlock) {
        var block = this.cursorLocation.block;

        if (block.isBeginningOfDocument) {
          // can't do anything, we're at the beginning
          return;
        }

        // TODO handle parents/children
        this.cursorLocation = EditDocument.mergeBlocks(block.previousBlock, block);
      } else {
        this.cursorLocation.moveBackwardInBlock();
        this.cursorLocation.removeNextInBlock();
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public handleDelete() {
      this.setSelectionMode(false);
      // todo handle selected text

      if (this.cursorLocation.isEndOfBlock) {
        var block = this.cursorLocation.block;

        if (block.isEndOfDocument) {
          // can't do anything, we're at the end
          return;
        }

        this.cursorLocation = EditDocument.mergeBlocks(block, block.nextBlock);
      } else {
        this.cursorLocation.removeNextInBlock();
        //this.position.block.element.removeChild(this.position.nextElement);
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */ 
    public handleEnter() {
      // TODO handle selected text
      this.setSelectionMode(false);

      EditDocument.splitBlock(this.cursorLocation);
      this.cursorLocation.moveForward();

      this.markCursorMovedWithoutState();
    }
  }
}