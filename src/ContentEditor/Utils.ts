module TextRight.Utils
{
  import PointPosition = TextRight.Editor.Internal.PointPosition;
  
  /**
   * Math related utility functions
   */
  export class MathUtils {
    
    /**
     * Clamp the given value to be between two values
     */
    public static clamp(value: number, min: number, max: number): number {
      return Math.max(Math.min(value, max), min);
    }

  }

  /**
   * String related utility functions
   */
  export class StringUtils {

    /**
     * Split a series of text on newlines (LF or CRLF or CR)
     */
    public static splitLines(text: string) {
      return text.split(/\r\n?|\n|\r/);
    }
  }

  /**
   * Html related utility functions
   */
  export class HtmlUtils {

    /**
     * Create a new element and append it to the given parent element
     * @param parent the element to which the newly created element will
     *        be added
     * @param type the name of the element to create ("DIV" or "P" for example)
     * @param firstClass a class to assign to the newly created element
     */
    public static appendNewElement(parent: HTMLElement,
                                   type: string,
                                   firstClass: string = null): HTMLElement {

      var element = document.createElement(type);

      if (firstClass != null) {
        element.classList.add(firstClass);
      }
      parent.appendChild(element);
      return element;
    }

    /**
     *  Create a new element and assign it the given class
     * @param type the name of the element to create ("DIV" or "P" for example)
     * @param firstClass a class to assign to the newly created element
     */
    public static createWithClass(type: string, firstClass: string): HTMLElement {
      var element = document.createElement(type);
      element.classList.add(firstClass);
      return element;
    }

    /**
     * Remove the children of the given element
     */
    public static clearChildren(element: HTMLElement) {
      while (element.lastChild) {
        element.removeChild(element.lastChild);
      }
    }

    /**
     * Get the index of the given node in the parent's given child list
     */
    public static findOffsetOf(node: Node): number {
      var count = 0;
      var curr = node.parentNode.firstChild;

      while (curr !== node) {
        count++;
        curr = curr.nextSibling;
      }

      return count;
    }

    /**
     * Get the index of an element within the parent array
     * @return the index of child in parent.children, or -1 if it does
     *         not exist as a child of parent
     */
    public static indexOf(parent: HTMLElement, child: HTMLElement): number {
      // return Array.prototype.indexOf.call(parent.children, child);
      var index = 0;

      var element = parent.firstElementChild;
      while (element != null) {
        if (element === child) {
          // found it bail out
          return index;
        }
        element = element.nextElementSibling;
        index++;
      }

      return -1;
    }

    /**
     * Get the contents of the element as a document fragment
     */
    public static convertToFragment(element: HTMLElement): DocumentFragment {
      var range = document.createRange();
      range.selectNodeContents(element);
      var contents = range.extractContents();
      range.detach();
      return contents;
    }

    private static cachedRange = document.createRange();

    /**
     * Convert a ClientRect into a PointPosition, taking into account the windows current
     * scroll position.
     */
    private static fromClientRect(rect: ClientRect): PointPosition {
      return new PointPosition(
        rect.top + window.pageYOffset,
        rect.left + window.pageXOffset,
        rect.height,
        rect.width);
    }

    /**
     * Gets the box outline of the given element, in page coordinates
     */
    public static getBoundingClientRectOfElement(element: Element): PointPosition {
      return HtmlUtils.fromClientRect(element.getBoundingClientRect());
    }

    /**
     * Get the position of a single node, in page coordinates
     */
    public static getBoundingClientRectOf(node: Node): PointPosition {
      // elements have a much more optimized method of getting the size:
      if (node instanceof Element) {
        return this.getBoundingClientRectOfElement(<HTMLElement>node);
      }

      var range = HtmlUtils.cachedRange;
      range.selectNode(node);
      var rect = range.getBoundingClientRect();

      return HtmlUtils.fromClientRect(rect);
    }

    /**
     * Remove the given element from its parent collection
     */
    public static removeElement(element: HTMLElement) {
      element.parentElement.removeChild(element);
    }

    /**
     * Set the top/left/height/width of an element
     */
    public static positionElement(
      element: HTMLElement,
      top: number,
      left: number,
      height: number,
      width: number) {

      element.style.top = (top) + "px";
      element.style.left = (left) + "px";
      element.style.height = (height) + "px";
      element.style.width = (width) + "px";
    }

  }

  export class DebouncingTimer {
    private timerId: number;

    constructor(private timeout: number, private callback: {(): void}) {
    }

    public trigger() {
      if (this.timerId != null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }

      this.timerId = setTimeout(this.callback, this.timeout);
    }
  }
}