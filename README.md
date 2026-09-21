- Node.js
- Chrome or Edge

## RUN

```bash
npm install
npm run setup:emsdk
npm run build:wasm
npm run dev
```


## explain:
---
Motion event #2
9.2s → 9.2s · peak 6.78%

event number 2:
- 9.2s → 9.2s: event started at video time 9.2s and ended at 9.2s
- peak 6.78%: max detected motion inside ROI during that event was 6.78%
---
Threshold: minimum pixel-change needed to mark motion.

---
## initWasm:
- Loads WASM JavaScript glue file: /wasm/motion_wasm.js
- Waits until Emscripten runtime ready.
- Stores promise in modulePromise, so WASM loads only once.
- Returns WASM module with native funcs like _malloc, _free, _processMotion.

## processWithWasm(image, threshold)
- Sends one video frame to WASM.
- Steps:
- waits for WASM ready via initWasm()
- gets raw RGBA pixels from image.data
- allocates WASM memory using _malloc
- copies pixels into WASM heap
- calls C++ function:module._processMotion(pointer, image.width, image.height, threshold)
- reads processed output frame from WASM memory
- returns:
    {
       processedData: ImageData,
       changedPixels: number
    }
- frees input memory with _free

## resetWasm()
- Waits for WASM ready.
- Calls: _resetMotionDetector()
- Clears previous-frame state inside C++ motion detector.
- Needed before fresh analysis, otherwise first frame of new run may compare against stale old frame.
