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
    private caretLocation: DocumentCursor;

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
      this.caretLocation = this.documentModel.firstBlock.beginning;
      this.selectionStart = this.documentModel.firstBlock.beginning;

      this.initializeTextArea();

      this.caretPresenter = new CaretPresenter(this.documentModel, this.inputTextArea);
      this.selectionPresenter = new TextRight.Editor.Internal.SelectionPresenter(this.documentModel);

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
      this.caretLocation = this.documentModel.insertText(this.caretLocation, text);

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
          this.selectionStart = this.caretLocation.clone();
        }

      } else {
        this.selectionStart = null;
      }
    }

    /**
     * Redraw the caret and current selection
     */
    private redrawCaretAndSelection() {
      this.caretPresenter.updateCaretLocation(this.caretLocation);

      if (this.hasSelection) {
        this.selectionPresenter.update(this.selectionStart, this.caretLocation);
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
    public setCaret(x: number, y: number, shouldExtendSelection: boolean) {
      this.inputTextArea.focus();

      this.setSelectionMode(shouldExtendSelection);

      // move to the designated location
      var position = this.documentModel.getCursorFromLocation(x, y);

      if (position != null) {
        this.caretLocation = position;
        this.markCursorMovedWithoutState();
      }
    }

    /* @inherit from IInputHandler */
    public moveUp(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.movementState == null) {
        this.movementState = CursorNavigationState.fromPosition(this.caretLocation.getCursorPosition().left);
      }

      this.caretLocation.moveUpwards(this.movementState);
      this.markCursorMovedWithState();
    }

    /* @inherit from IInputHandler */
    public moveDown(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.movementState == null) {
        this.movementState = CursorNavigationState.fromPosition(this.caretLocation.getCursorPosition().left);
      }

      this.caretLocation.moveDownwards(this.movementState);
      this.markCursorMovedWithState();
    }

    /* @inherit from IInputHandler */
    public navigateLeft(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.caretLocation.moveBackwards();
      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public navigateRight(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.caretLocation.moveForward();
      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public navigateWordLeft(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.caretLocation.isBeginningOfBlock) {
        if (!this.caretLocation.block.isBeginningOfDocument) {
          this.caretLocation.moveToEndOf(this.caretLocation.block.previousBlock);
        }
      } else {
        var cursor = this.caretLocation;

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

      if (this.caretLocation.isEndOfBlock) {
        if (!this.caretLocation.block.isEndOfDocument) {
          this.caretLocation.moveToBeginningOf(this.caretLocation.block.nextBlock);
        }
      } else {
        var cursor = this.caretLocation;

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

      if (!this.caretLocation.isBeginningOfBlock) {
        this.caretLocation.moveToBeginningOf(this.caretLocation.block);
      } else if (this.caretLocation.isBeginningOfBlock) {
        if (!this.caretLocation.block.isBeginningOfDocument) {
          this.caretLocation.moveToBeginningOf(this.caretLocation.block.previousBlock);
        }
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public navigateBlockDown(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (!this.caretLocation.block.isEndOfDocument) {
        this.caretLocation.moveToBeginningOf(this.caretLocation.block.nextBlock);
      } else {
        this.caretLocation.moveToEndOf(this.caretLocation.block);
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public handleEnd(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.movementState = CursorNavigationState.endOfLine;

      this.caretLocation.moveToEndOfLine();
      this.markCursorMovedWithState();
    }

    /* @inherit from IInputHandler */
    public handleHome(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.movementState = CursorNavigationState.beginningOfLine;

      this.caretLocation.moveToBeginningOfLine();
      this.markCursorMovedWithState();
    }

    /* @inherit from IInputHandler */
    public handleBackspace() {
      this.setSelectionMode(false);

      if (this.hasSelection) {
        this.caretLocation = this.documentModel.removeBetween(this.selectionStart, this.caretLocation);
      } else if (this.caretLocation.isBeginningOfBlock) {
        var block = this.caretLocation.block;

        if (block.isBeginningOfDocument) {
          // can't do anything, we're at the beginning
          return;
        }

        // TODO handle parents/children
        this.caretLocation = this.documentModel.mergeBlocks(block.previousBlock, block);
      } else {
        this.caretLocation.moveBackwardInBlock();
        this.caretLocation.removeNextInBlock();
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */
    public handleDelete() {
      this.setSelectionMode(false);

      if (this.hasSelection) {
        this.caretLocation = this.documentModel.removeBetween(this.selectionStart, this.caretLocation);
      } else if (this.caretLocation.isEndOfBlock) {
        var block = this.caretLocation.block;

        if (block.isEndOfDocument) {
          // can't do anything, we're at the end
          return;
        }

        this.caretLocation = this.documentModel.mergeBlocks(block, block.nextBlock);
      } else {
        this.caretLocation.removeNextInBlock();
        //this.position.block.element.removeChild(this.position.nextElement);
      }

      this.markCursorMovedWithoutState();
    }

    /* @inherit from IInputHandler */ 
    public handleEnter() {
      // TODO handle selected text
      this.setSelectionMode(false);

      this.documentModel.splitBlock(this.caretLocation);
      this.caretLocation.moveForward();

      this.markCursorMovedWithoutState();
    }
  }
}