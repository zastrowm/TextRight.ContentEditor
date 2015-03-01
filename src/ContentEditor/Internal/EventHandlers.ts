 
module TextRight.Internal {

  /**
   * Allows enabling or disabling the handler for an event.
   */
  export interface IEventHandler {

    /**
     * Enable the event handler so that starts reports events.
     */
    enable(): void;

    /**
     * Disables the event handler so that it stops reports events.
     */
    disable(): void;
  }

  /**
   * Convenience methods for creating instances of IEventHandler
   */
  export class EventHandlers {

    /**
     * Creates a a handler for the specific event target and specified event name.
     * @param instance the object to create the event handler for.
     * @param eventName the name of the event that the event handler will enable or disable.
     * @param handler the method that will be invoked when the event is triggered.
     * @param shouldBeEnabledByDefault (optional) true if the event handler should be enabled
     *                                 before returning
     * @return An IEventHandler that is not yet enabled.
     */
    public static from(
      instance: EventTarget,
      eventName: string,
      handler: (evt) => void,
      shouldBeEnabledByDefault: boolean = false
      ) : IEventHandler {

      var eventHandler = new EventHandler(instance, eventName, handler);

      if (shouldBeEnabledByDefault) {
        eventHandler.enable();
      }

      return eventHandler;
    }

    /**
     * Creates a a handler for the specific event targets and specified event name.
     * @param instances the objects to create the event handler for.  If the returned event
     *                  handler is enabled and any of the objects trigger the event, the
     *                  event handler will be invoked.
     * @param eventName the name of the event that the event handler will enable or disable.
     * @param handler the method that will be invoked when any of the instances trigger the
     *                given event.
     * @param shouldBeEnabledByDefault (optional) true if the event handler should be enabled
     *                                 before returning
     * @return An IEventHandler that is not yet enabled.
     */
    public static fromMany(
      instances: EventTarget[],
      eventName: string,
      handler: (evt) => void,
      shouldBeEnabledByDefault: boolean = false
      ) : IEventHandler {
      var eventHandler = new MultiInstanceEventHandler(instances, eventName, handler);

      if (shouldBeEnabledByDefault) {
        eventHandler.enable();
      }

      return eventHandler;
    }
  }

  /**
   * An event handler for a single target and event
   */
  class EventHandler implements IEventHandler {

    constructor(
      private instance: EventTarget,
      private eventName: string,
      private handler: (evt) => void) {
    }

    public enable() {
      this.instance.addEventListener(this.eventName, this.handler);
    }

    public disable() {
      this.instance.removeEventListener(this.eventName, this.handler);
    }
  }

  /**
   * An event handler for a single target and event
   */
  class MultiInstanceEventHandler implements IEventHandler {
    constructor(
      private instances: EventTarget[],
      private eventName: string,
      private handler: (evt) => void) {
    }

    public enable() {
      this.instances.forEach((instance: EventTarget) => {
        instance.addEventListener(this.eventName, this.handler);
      });
    }

    public disable() {
      this.instances.forEach((instance: EventTarget) => {
        instance.removeEventListener(this.eventName, this.handler);
      });
    }
  }
}