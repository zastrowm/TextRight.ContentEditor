module TextRight.Editor.Internal {
  import DebouncingTimer = TextRight.Utils.DebouncingTimer;
  import HtmlUtils = TextRight.Utils.HtmlUtils;
  import CharacterCategorizer = TextRight.Internal.CharacterCategorizer

  /**
   * Wraps an element and allows editing, providing a cursor and handling
   * operations that modify the text within the element.
   */
  export class DocumentView implements IInputHandler {
    private cursor: HTMLElement;

    private blinkTimer: DebouncingTimer;

    private position: Internal.DocumentCursor;

    private inputTextArea: HTMLTextAreaElement;

    private characterCategorizer: CharacterCategorizer;

    private documentModel: DocumentModel;

    /**
     * Create a new DocumentView that handles the given div as an editable document
     */
    constructor(private element: HTMLDivElement) {
      this.characterCategorizer = CharacterCategorizer.instance;

      this.documentModel = new DocumentModel(element);
      this.position = this.documentModel.firstBlock.beginning;

      this.initializeTextArea();
      this.initializeCursor();

      this.blinkTimer = new DebouncingTimer(500, () => this.toggleCursor());

      this.markTyping();
      this.refreshCursorView();

      element.addEventListener('mousedown', evt => this.handleMouseDown(evt));

      element.addEventListener('resize', () => this.handleResize());
      window.addEventListener('resize', () => this.handleResize());

      var inputProcessor = new TextInputProcessor(this.inputTextArea, this);
      setInterval(() => inputProcessor.readInput(), 50);
    }

    private initializeCursor(): void {
      this.cursor = document.createElement("div");
      this.cursor.classList.add(ElementClasses.cursor);
      this.element.appendChild(this.cursor);
    }

    private initializeTextArea(): void {
      this.inputTextArea = document.createElement("textarea");
      this.inputTextArea.classList.add(ElementClasses.textareaInput);
      this.element.appendChild(this.inputTextArea);
    }

    private markTyping() {
      this.cursor.style.display = "block";
      this.blinkTimer.trigger();
    }

    private toggleCursor() {
      var isHidden = this.cursor.style.display === "none";
      this.cursor.style.display = isHidden ? "block" : "none";
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
        this.position = position;
        this.refreshCursorView();
        this.markTyping();
      }

      // TODO figure out where we clicked
    }

    /**
     * Handles the events that occur when the text input has changed.
     */
    public handleTextAddition(text: string) {
      this.position = this.documentModel.insertText(this.position, text);

      this.refreshCursorView();
      this.markTyping();
    }

    private refreshCursorView(shouldMaintainPreferredPosition: boolean = false) {
      var pos = this.position.getCursorPosition();

      var cssTop = pos.top + "px";
      var cssLeft = pos.left + "px";
      var height = pos.height + "px";

      this.cursor.style.top = cssTop;
      this.cursor.style.left = cssLeft;
      this.cursor.style.height = height;

      this.inputTextArea.style.top = cssTop;
      this.inputTextArea.style.left = cssLeft;
      this.inputTextArea.style.height = height;

      if (!shouldMaintainPreferredPosition) {
        this.movementState = null;
      }
    }

    private movementState: CursorNavigationState = null;

    /* @inherit from IInputHandler */
    public moveUp() {
      if (this.movementState == null) {
        this.movementState = CursorNavigationState.fromPosition(this.position.getCursorPosition().left);
      }

      this.position.moveUpwards(this.movementState);

      this.refreshCursorView(true);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public moveDown() {
      if (this.movementState == null) {
        this.movementState = CursorNavigationState.fromPosition(this.position.getCursorPosition().left);
      }

      this.position.moveDownwards(this.movementState);

      this.refreshCursorView(true);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateLeft() {
      this.position.moveBackwards();

      this.refreshCursorView();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateRight() {
      this.position.moveForward();

      this.refreshCursorView();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateBlockUp() {
      if (!this.position.isBeginningOfBlock) {
        this.position.moveToBeginningOf(this.position.block);
      } else if (this.position.isBeginningOfBlock) {
        if (!this.position.block.isBeginningOfDocument) {
          this.position.moveToBeginningOf(this.position.block.previousBlock);
        }
      }

      this.refreshCursorView();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateBlockDown() {
      if (!this.position.block.isEndOfDocument) {
        this.position.moveToBeginningOf(this.position.block.nextBlock);
      }

      this.refreshCursorView();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public handleBackspace() {
      if (this.position.isBeginningOfBlock) {
        var block = this.position.block;

        if (block.isBeginningOfDocument) {
          // can't do anything, we're at the beginning
          return;
        }

        // TODO handle parents/children
        this.position = EditDocument.mergeBlocks(block.previousBlock, block);
      } else {
        this.position.moveBackwardInBlock();
        this.position.removeNextInBlock();
      }

      this.refreshCursorView();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public handleDelete() {
      if (this.position.isEndOfBlock) {
        var block = this.position.block;

        if (block.isEndOfDocument) {
          // can't do anything, we're at the end
          return;
        }

        this.position	= EditDocument.mergeBlocks(block, block.nextBlock);
      } else {
        this.position.removeNextInBlock();
        //this.position.block.element.removeChild(this.position.nextElement);
      }

      this.refreshCursorView();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public handleEnter() {
      EditDocument.splitBlock(this.position);
      this.position.moveForward();

      this.refreshCursorView();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public handleEnd() {
      this.position.moveToEndOfLine();

      this.movementState = CursorNavigationState.endOfLine;

      this.refreshCursorView(true);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public handleHome() {
      this.position.moveToBeginningOfLine();

      this.movementState = CursorNavigationState.beginningOfLine;

      this.refreshCursorView(true);
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateWordLeft() {
      if (this.position.isBeginningOfBlock) {
        if (!this.position.block.isBeginningOfDocument) {
          this.position.moveToEndOf(this.position.block.previousBlock);
        }
      } else {
        var cursor = this.position;

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

      this.refreshCursorView();
      this.markTyping();
    }

    /* @inherit from IInputHandler */
    public navigateWordRight() {
      if (this.position.isEndOfBlock) {
        if (!this.position.block.isEndOfDocument) {
          this.position.moveToBeginningOf(this.position.block.nextBlock);
        }
      } else {
        var cursor = this.position;

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

      this.refreshCursorView();
      this.markTyping();
    }
  }
}