﻿module TextRight.Editor.Internal {
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
    constructor(public top: number, public left: number, public height: number) {
    }

    /**
     * Create a position which looks at the right side of the given client rectangle.
     */
    public static rightOf(rect: ClientRect) {
      return new PointPosition(rect.top, rect.right, rect.height);
    }

     /**
     * Create a position which looks at the left side of the given client rectangle.
     */
    public static leftOf(rect: ClientRect) {
      return new PointPosition(rect.top, rect.left, rect.height);
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
      return second.top < first.top + first.height;
    }

    /**
     * Get the distance to a left offset.
     */
    public distanceTo(left: number): number {
      return Math.abs(left - this.left);
    }
  }
}