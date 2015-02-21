module TextRight.Editor.Internal {
  /**
   * State describing how the cursor should move when navigating up or down.  This encapsulates the
   * state when navigating up/down after using Home/End keys.
   */
  export class CursorNavigationState {
    public x: number;

    /**
     * Default constructor, do not use
     */
    constructor() {
      this.x = 0;
    }

    /**
     * Create a state which represents moving towards the given coordinate. Used when
     * hitting the up/down key after typing and we should attempt to maintain the "line"
     * when moving between virtual lines.
     */
    public static fromPosition(x: number) {
      var state = new CursorNavigationState();
      state.x = x;
      return state;
    }

    /**
     * Move towards the end of the line. Typically used after hitting the End key.
     */
    public static endOfLine = new CursorNavigationState();

    /**
     * Move towards the beginning of the line.  Typically used after hitting the Home key.
     */
    public static beginningOfLine = new CursorNavigationState();
  }
}