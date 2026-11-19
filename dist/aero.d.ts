export interface AeroRuntime {
  /** Re-scan the page now. Normally not needed: new elements are picked up automatically. */
  refresh(): void;
  /** A scrubbed element's position in its range, 0 to 1. */
  progress(el: Element): number;
}
declare global {
  interface Window { Aero: AeroRuntime }
}
export declare const refresh: AeroRuntime["refresh"];
export declare const progress: AeroRuntime["progress"];
declare const Aero: AeroRuntime;
export default Aero;
