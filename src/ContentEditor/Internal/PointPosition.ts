module TextRight.Editor.Internal {
  /**
   * Encapsulates where a cursor should appear for a given DocumentCursor.
   */
  export class PointPosition {

    /**
     * Constructor.
     * @param {number} top where the top of the cursor would be located.
     * @param {number} left where left of the cursor would be located.
     * @param {number} height the hight of the cursor.
     */
    constructor(public top: number, public left: number, public height: number, public width: number) {
    }

     /**
     * The height added to the top
     */
    public get bottom() {
      return this.top + this.height;
    }

    /**
     * The width added to the left
     */
    public get right() {
      return this.left + this.width;
    }

    /**
     * Check if one point is considered in the same line as another element.  A point is
     * considered on the same line if the height of one position continues onto the same
     * line as the top of the other position.
     */
    public isInlineWith(position: PointPosition) {
      var first: PointPosition;
      var second: PointPosition;

      // get the higher point
      if (this.top <= position.top) {
        first = this;
        second = position;
      } else {
        first = position;
        second = this;
      }

      // if the second point has its top between the top of the first
      // point and the first points bottom, the second point is considered
      // inline with the other
      // WASBUG: there should be an overlap of at least 1 or 2 pixels, thus the 2 offset
      return second.top < (first.top + first.height - 2);
    }

    /**
     * Get the distance to a left offset.
     */
    public distanceTo(left: number): number {
      return Math.abs(left - this.left);
    }
  }
}