module TextRight.Internal.Utils {

  export class Strings {
    
    /**
     * Format a string with various arguments, similar to .NET's String.Format
     */
    public static format(format: string, ...args: any[]): string {
      return format.replace(/{(\d+)}/g,(match, index) =>
        (typeof args[index] != "undefined"? args[index]: match));
    }

  }
 }