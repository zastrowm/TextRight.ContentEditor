
module TextRight.Editor.Internal {

  // ~ Int32.MaxValue
  var maxIntBeforeRollover = 21474836400;

  /**
   * An abstract idea of an object that represents the state of an object at a certain
   * point in time.
   */
  export interface ISnapshotToken {

  }

  /**
   * Provides ISnapshotToken and creates unique tokens to give out to providers
   */
  export class SnapshotTokenProvider {
    public token: number;

    constructor() {
      this.token = 1;
    }

    /**
     * Move to the next cache index
     */
    public increment() {
      this.token++;

      if (this.token > maxIntBeforeRollover) {
        this.token = 1;
      }
    }

    /**
     * Check if a given token is current
     */
    public isValid(token: ISnapshotToken) {
      return this.token == token;
    }
  }
}