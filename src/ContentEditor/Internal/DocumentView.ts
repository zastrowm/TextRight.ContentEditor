module TextRight.Editor.Internal {
  import DebouncingTimer = TextRight.Utils.DebouncingTimer;
  import CharacterCategorizer = TextRight.Internal.CharacterCategorizer

  /**
   * Wraps an element and allows editing, providing a cursor and handling
   * operations that modify the text within the element.
   */
  export class DocumentView implements IInputHandler {
    private cursorElement: HTMLElement;

    private blinkTimer: DebouncingTimer;

    private inputTextArea: HTMLTextAreaElement;

    private characterCategorizer: CharacterCategorizer;

    private documentModel: DocumentModel;

    /** The state to use when moving up or down */
    private movementState: CursorNavigationState = null;

    /** Handles the presentation of the selection */
    private selectionPresenter: SelectionPresenter;

    /** Where the current selection starts. */
    private selectionStart: DocumentCursor;

    /** Where the current selection ends.  Also used as the insertion point when we don't have a selection. */
    private cursorLocation: DocumentCursor;

    /**
     * Create a new DocumentView that handles the given div as an editable document
     */
    constructor(private element: HTMLDivElement) {
      this.characterCategorizer = CharacterCategorizer.instance;

      this.documentModel = new DocumentModel(element);
      this.cursorLocation = this.documentModel.firstBlock.beginning;
      this.selectionStart = this.documentModel.firstBlock.beginning;

      this.initializeTextArea();
      this.initializeCursor();

      this.selectionPresenter = new TextRight.Editor.Internal.SelectionPresenter(element);
      this.blinkTimer = new DebouncingTimer(500, () => this.toggleCursor());

      this.markTyping();
      this.refreshCursorView(false);

      element.addEventListener('mousedown', evt => this.handleMouseDown(evt));

      element.addEventListener('resize', () => this.handleResize());
      window.addEventListener('resize', () => this.handleResize());

      var inputProcessor = new TextInputProcessor(this.inputTextArea, this);
      setInterval(() => inputProcessor.readInput(), 50);
    }

    private initializeCursor(): void {
      this.cursorElement = document.createElement("div");
      this.cursorElement.classList.add(ElementClasses.cursor);
      this.element.appendChild(this.cursorElement);
    }

    private initializeTextArea(): void {
      this.inputTextArea = document.createElement("textarea");
      this.inputTextArea.classList.add(ElementClasses.textareaInput);
      this.element.appendChild(this.inputTextArea);
    }

    private markTyping() {
      this.cursorElement.style.display = "block";
      this.blinkTimer.trigger();
    }

    private toggleCursor() {
      var isHidden = this.cursorElement.style.display === "none";
      this.cursorElement.style.display = isHidden ? "block" : "none";
      this.blinkTimer.trigger();
    }

    public focus(): void {
      this.inputTextArea.focus();
    }

    public handleResize() {
      this.refreshCursorView(true);
    }

    public handleMouseDown(evt: MouseEvent) {
      evt.preventDefault();

      this.inputTextArea.focus();

      var position = this.documentModel.getCursorFromLocation(evt.clientX,evt.clientY);

      if (position != null) {
        this.setSelectionMode(false);
        this.cursorLocation = position;
        this.refreshCursorView(false);
        this.markTyping();
      }

      // TODO figure out where we clicked
    }

    /**
     * Handles the events that occur when the text input has changed.
     */
    public handleTextAddition(text: string) {
      this.cursorLocation = this.documentModel.insertText(this.cursorLocation, text);

      this.setSelectionMode(false);
      this.refreshCursorView(false);
      this.markTyping();
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
     * Refresh the current cursor location
     */
    private refreshCursorView(shouldMaintainPreferredPosition: boolean) {
      // TODO split out the handling of shouldMaintainPreferredPosition and 
      // the actual refresh of the cursor location 
      var pos = this.cursorLocation.getCursorPosition();

      var cssTop = pos.top + "px";
      var cssLeft = pos.left + "px";
      var height = pos.height + "px";

      this.cursorElement.style.top = cssTop;
      this.cursorElement.style.left = cssLeft;
      this.cursorElement.style.height = height;

      this.inputTextArea.style.top = cssTop;
      this.inputTextArea.style.left = cssLeft;
      this.inputTextArea.style.height = height;

      if (!shouldMaintainPreferredPosition) {
        this.movementState = null;
      }

      if (this.selectionStart != null) {
        this.selectionPresenter.update(this.selectionStart, this.cursorLocation);
      } else {
        this.selectionPresenter.disable();
      }

      this.focus();
    }

    /* @inherit from IInputHandler */
    public moveUp(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.movementState == null) {
        this.movementState = CursorNavigationState.fromPosition(this.cursorLocation.getCursorPosition().left);
      }

      this.cursorLocation.moveUpwards(this.movementState);

      this.refreshCursorView(true);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public moveDown(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (this.movementState == null) {
        this.movementState = CursorNavigationState.fromPosition(this.cursorLocation.getCursorPosition().left);
      }

      this.cursorLocation.moveDownwards(this.movementState);

      this.refreshCursorView(true);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateLeft(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.cursorLocation.moveBackwards();

      this.refreshCursorView(false);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateRight(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.cursorLocation.moveForward();

      this.refreshCursorView(false);
      this.markTyping();
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

      this.refreshCursorView(false);
      this.markTyping();
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

      this.refreshCursorView(false);
      this.markTyping();
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

      this.refreshCursorView(false);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateBlockDown(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      if (!this.cursorLocation.block.isEndOfDocument) {
        this.cursorLocation.moveToBeginningOf(this.cursorLocation.block.nextBlock);
      }

      this.refreshCursorView(false);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public handleEnd(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.cursorLocation.moveToEndOfLine();

      this.movementState = CursorNavigationState.endOfLine;

      this.refreshCursorView(true);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public handleHome(shouldExtendSelection: boolean) {
      this.setSelectionMode(shouldExtendSelection);

      this.cursorLocation.moveToBeginningOfLine();

      this.movementState = CursorNavigationState.beginningOfLine;

      this.markTyping();
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

      this.refreshCursorView(false);
      this.markTyping();
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

      this.refreshCursorView(false);
      this.markTyping();
    }

    /* @inherit from IInputHandler */ 
    public handleEnter() {
      // TODO handle selected text
      this.setSelectionMode(false);

      EditDocument.splitBlock(this.cursorLocation);
      this.cursorLocation.moveForward();

      this.refreshCursorView(false);
      this.markTyping();
    }
  }
}