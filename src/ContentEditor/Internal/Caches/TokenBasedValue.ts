module TextRight.Editor.Internal {
  import Logger = TextRight.Internal.Util.Logger;
  import HtmlUtils = TextRight.Utils.HtmlUtils;


  /**
   * A token-based value that only depends on one object to calculate its value
   */
  export class TokenBasedValueFromOneParent<TDataType, TParentType> {
    private token: ISnapshotToken;
    private value: TDataType;

    /**
     * Get the current value, calculating it if it is out of date according to provider
     * @param provider the token provider to use to determine staleness
     * @param parent the value to use when calculating a new value
     */
    public getValue(provider: SnapshotTokenProvider, parent: TParentType) {
      if (provider.isValid(this.token)) {
        return this.value;
      }

      this.value = this.calculateValue(parent);
      this.token = provider.token;

      return this.value;
    }

    /**
     * Calculate the value from the given parent
     */
    public calculateValue(parent: TParentType): TDataType {
      throw "Not Implemented";
    }

  }
} 