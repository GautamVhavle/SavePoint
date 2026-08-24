import '@testing-library/jest-dom/vitest';
Object.defineProperty(window,'matchMedia',{writable:true,value:(query:string)=>({matches:false,media:query,onchange:null,addListener:()=>undefined,removeListener:()=>undefined,addEventListener:()=>undefined,removeEventListener:()=>undefined,dispatchEvent:()=>false})});
// jsdom predates AbortSignal.any; approximate enough for transport tests.
if (!('any' in AbortSignal)) {
  Object.defineProperty(AbortSignal, 'any', {
    value: (signals: Iterable<AbortSignal>) => {
      const controller = new AbortController();
      for (const signal of signals) {
        if (signal.aborted) { controller.abort(signal.reason); break; }
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
      }
      return controller.signal;
    },
  });
}
