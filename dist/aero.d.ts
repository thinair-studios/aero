export interface AeroRuntime {
  /** Re-scan the page now. Normally not needed: new elements are picked up automatically. */
  refresh(): void;
  /** A scrubbed element's position in its range, 0 to 1. */
  progress(el: Element): number;
  /** Play the entrances and once-effects in el (and inside it) again, from the start. */
  replay(el: Element): void;
  /** Play el's .aero-leave-* exit. Resolves with el when it ends; { remove: true } removes it then. */
  leave<T extends Element>(el: T, options?: { remove?: boolean }): Promise<T>;
  /** Change the layout inside update(); .aero-morph elements move to their new places. */
  swap(update: () => void | Promise<void>, types?: string[]): Promise<void>;
}
declare global {
  interface Window { Aero: AeroRuntime }
}
export declare const refresh: AeroRuntime["refresh"];
export declare const progress: AeroRuntime["progress"];
export declare const replay: AeroRuntime["replay"];
export declare const leave: AeroRuntime["leave"];
export declare const swap: AeroRuntime["swap"];
declare const Aero: AeroRuntime;
export default Aero;
