
module TextRight.Editor.Internal {

  // ~ Int32.MaxValue
  var maxIntBeforeRollover = 21474836400;

  /**
   * An abstract idea of an object that represents the state of an object at a certain
   * point in time.
   */
  export interface ISnapshotToken {

    /**
     * Do not use.  Only exists so that we don't accidentally pass invalid properties to
     * functions accepting ISnapshotToken.
     */
    __isnapshottoken__: boolean;
  }

  /**
   * Provides ISnapshotToken and creates unique tokens to give out to providers
   */
  export class SnapshotTokenProvider {
    private internalToken: number;

    constructor() {
      this.internalToken = 1;
    }

    /** Get the token that represents the current state. */
    public get token(): ISnapshotToken {
      return <any>this.internalToken;
    }

    /** Move to the next cache index */
    public increment() {
      this.internalToken++;

      if (this.internalToken > maxIntBeforeRollover) {
        this.internalToken = 1;
      }
    }

    /** Check if a given token is current */
    public isValid(token: ISnapshotToken) {
      return this.token === token;
    }

    /** The default token to use. */
    public static get defaultToken(): ISnapshotToken {
      return <any>0;
    }
  }
}