# Agent Instructions
MotionGuard Web is a React, Vite, and TypeScript application for local video motion analysis in the browser.

## Commands
Install dependencies:
```bash
npm install
```

Run development server:
```bash
npm run dev
```

Type-check and create production build:
```bash
npm run build
```

Set up Emscripten:
```bash
npm run setup:emsdk
```

Build WebAssembly:
```bash
npm run build:wasm
```

Preview production build:
```bash
npm run preview
```

## Structure
- `src/App.tsx`: page composition and component wiring.
- `src/components`: presentational React components.
- `src/hooks/useMotionAnalysis.ts`: video state, canvas refs, analysis loop, WASM calls, telemetry, and event state.
- `src/features/roi.ts`: normalized region-of-interest calculations.
- `src/features/motionEvents.ts`: motion event tracking.
- `src/engine/wasmMotion.ts`: TypeScript bridge to Emscripten WASM.
- `src/engine/motionTypes.ts`: WASM module and result types.
- `wasm/cpp/motion_detection.cpp`: SIMD and multithreaded motion detector implementation.
- `public/wasm`: generated WASM runtime assets. Do not edit manually.
- `src/tailwind.css`: Tailwind CSS entry point.

## Editing Rules
- Use strict-safe TypeScript.
- Use Tailwind utility classes for styling. Do not recreate or reintroduce `src/styles.css`.
- Preserve Tailwind's Vite plugin in `vite.config.ts`.
- Preserve COOP and COEP headers in `vite.config.ts`; WASM pthreads require cross-origin isolation.
- Keep motion-processing logic in `useMotionAnalysis`.
- Keep components presentational and pass data/actions through props.
- Do not manually edit generated files under `public/wasm`.
- After changing C++ WASM source, run `npm run build:wasm`.
- After TypeScript, React, or configuration changes, run `npm run build`.
- Preserve existing responsive behavior at widths below 800px.

## Motion Behavior
- Threshold is the minimum per-pixel frame difference classified as motion.
- Valid threshold range is 1 through 255.
- ROI coordinates are normalized from 0 through 1.
- New events are prepended to the event array.
- Newest-first event labels use `events.length - i`, not `i + 1`.
- Stop then Start must preserve the event list and resume video playback.
- Selecting a new video resets the event tracker and event list.
- Analysis runs through the WASM bridge and renders processed pixels to the output canvas.

## Verification Checklist
- Run `npm run build` after code changes.
- Select a video and start analysis.
- Confirm FPS, latency, ROI motion, and events update.
- Stop and start again; confirm processing resumes and previous events remain.
- Select a different video; confirm events reset.
- Check desktop and mobile layouts.

## OBJECTIVEs OF THIS REPO
## Project Context
Project: MotionGuard Web
Vietnamese title: Hệ thống phân tích sự kiện chuyển động thời gian thực trên trình duyệt sử dụng WebAssembly.
Goal: build a local-first browser web app that analyzes motion events from uploaded video files or live camera input. Video must stay on the user device. Server may only serve static assets. Only event metadata, benchmark results, and exports may be saved.

## Core Product Requirements
- Accept MP4 video input and live camera input in modern browsers.
- Process video locally in browser; never upload raw video or frames to server.
- Use C++ WebAssembly motion engine inherited from Internship 2.
- Engine must support integer grayscale, separable blur, frame differencing, SIMD 128-bit, and pthreads where available.
- Generate motion mask from video frames.
- Support editable rectangular ROI and apply ROI during analysis.
- Detect connected components from motion mask.
- Compute bounding box, centroid, area, and motion intensity for moving regions.
- Implement simple tracking and event rules based on area, duration, position, and motion threshold.
- Show overlay with motion mask, bounding boxes, centroids, tracks, and ROI.
- Show timeline of motion events.
- Show dashboard metrics: FPS, latency, P95, P99, dropped frames, memory where practical, and browser API status.
- Implement adaptive quality controller using scale reduction, frame sampling, or ROI prioritization when latency budget is exceeded.
- Export event metadata as JSON and CSV.

## Performance Targets
- Main target: 1080p video at 30 FPS on target machine.
- Frame budget: 33.3 ms/frame.
- Benchmark success: P95 latency should not exceed 33.3 ms on 1080p benchmark clips.
- 4K target: maintain UI responsiveness, not fixed 30 FPS. Use adaptive scale or frame sampling.
- Previous Internship 2 result: best SIMD + pthreads core latency was about 11.13 ms/frame, but end-to-end throughput was 27.9 FPS due to bridge/copy/render overhead. Optimize full pipeline, not only WASM core.

# AGENTS.md

## Project Context

Project: MotionGuard Web

Vietnamese title: Hệ thống phân tích sự kiện chuyển động thời gian thực trên trình duyệt sử dụng WebAssembly.

Goal: build a local-first browser web app that analyzes motion events from uploaded video files or live camera input. Video must stay on the user device. Server may only serve static assets. Only event metadata, benchmark results, and exports may be saved.

Source proposal: `vhquoc-proposal.pdf`.

## Core Product Requirements

- Accept MP4 video input and live camera input in modern browsers.
- Process video locally in browser; never upload raw video or frames to server.
- Use C++ WebAssembly motion engine inherited from Internship 2.
- Engine must support integer grayscale, separable blur, frame differencing, SIMD 128-bit, and pthreads where available.
- Generate motion mask from video frames.
- Support editable rectangular ROI and apply ROI during analysis.
- Detect connected components from motion mask.
- Compute bounding box, centroid, area, and motion intensity for moving regions.
- Implement simple tracking and event rules based on area, duration, position, and motion threshold.
- Show overlay with motion mask, bounding boxes, centroids, tracks, and ROI.
- Show timeline of motion events.
- Show dashboard metrics: FPS, latency, P95, P99, dropped frames, memory where practical, and browser API status.
- Implement adaptive quality controller using scale reduction, frame sampling, or ROI prioritization when latency budget is exceeded.
- Export event metadata as JSON and CSV.

## Performance Targets

- Main target: 1080p video at 30 FPS on target machine.
- Frame budget: 33.3 ms/frame.
- Benchmark success: P95 latency should not exceed 33.3 ms on 1080p benchmark clips.
- 4K target: maintain UI responsiveness, not fixed 30 FPS. Use adaptive scale or frame sampling.
- Previous Internship 2 result: best SIMD + pthreads core latency was about 11.13 ms/frame, but end-to-end throughput was 27.9 FPS due to bridge/copy/render overhead. Optimize full pipeline, not only WASM core.

## Architecture
Use local browser pipeline with these modules:
- Input: video file, camera stream.
- Capture/decode: baseline `HTMLVideoElement` + Canvas 2D. Optional `WebCodecs` only when supported.
- Scheduling/control: frame scheduler, metrics collection, adaptive quality controller.
- Processing core: C++ WebAssembly, SIMD 128-bit, pthreads, SharedArrayBuffer where available.
- Event analysis: ROI filter, noise filtering, connected components, blob tracking, rule engine.
- Presentation: video overlay, ROI editor, dashboard, timeline.
- Storage/export: local metadata only, JSON/CSV export, optional IndexedDB/OPFS.

# AGENTS.md

## Project Context

Project: MotionGuard Web

Vietnamese title: Hệ thống phân tích sự kiện chuyển động thời gian thực trên trình duyệt sử dụng WebAssembly.

Goal: build a local-first browser web app that analyzes motion events from uploaded video files or live camera input. Video must stay on the user device. Server may only serve static assets. Only event metadata, benchmark results, and exports may be saved.

Source proposal: `vhquoc-proposal.pdf`.

## Core Product Requirements

- Accept MP4 video input and live camera input in modern browsers.
- Process video locally in browser; never upload raw video or frames to server.
- Use C++ WebAssembly motion engine inherited from Internship 2.
- Engine must support integer grayscale, separable blur, frame differencing, SIMD 128-bit, and pthreads where available.
- Generate motion mask from video frames.
- Support editable rectangular ROI and apply ROI during analysis.
- Detect connected components from motion mask.
- Compute bounding box, centroid, area, and motion intensity for moving regions.
- Implement simple tracking and event rules based on area, duration, position, and motion threshold.
- Show overlay with motion mask, bounding boxes, centroids, tracks, and ROI.
- Show timeline of motion events.
- Show dashboard metrics: FPS, latency, P95, P99, dropped frames, memory where practical, and browser API status.
- Implement adaptive quality controller using scale reduction, frame sampling, or ROI prioritization when latency budget is exceeded.
- Export event metadata as JSON and CSV.

## Performance Targets

- Main target: 1080p video at 30 FPS on target machine.
- Frame budget: 33.3 ms/frame.
- Benchmark success: P95 latency should not exceed 33.3 ms on 1080p benchmark clips.
- 4K target: maintain UI responsiveness, not fixed 30 FPS. Use adaptive scale or frame sampling.
- Previous Internship 2 result: best SIMD + pthreads core latency was about 11.13 ms/frame, but end-to-end throughput was 27.9 FPS due to bridge/copy/render overhead. Optimize full pipeline, not only WASM core.

## Architecture

Use local browser pipeline with these modules:

- Input: video file, camera stream.
- Capture/decode: baseline `HTMLVideoElement` + Canvas 2D. Optional `WebCodecs` only when supported.
- Scheduling/control: frame scheduler, metrics collection, adaptive quality controller.
- Processing core: C++ WebAssembly, SIMD 128-bit, pthreads, SharedArrayBuffer where available.
- Event analysis: ROI filter, noise filtering, connected components, blob tracking, rule engine.
- Presentation: video overlay, ROI editor, dashboard, timeline.
- Storage/export: local metadata only, JSON/CSV export, optional IndexedDB/OPFS.

## Processing Pipeline
1. Capture frame from video or camera.
2. Convert RGBA to grayscale using integer approximation.
3. Smooth frame using separable box blur / sliding window.
4. Compare current and previous grayscale frames with SIMD to produce motion mask.
5. Apply ROI and noise filtering by area or morphology when needed.
6. Run connected components.
7. Compute bounding box, centroid, area, and intensity.
8. Update simple tracks.
9. Apply event rules with hysteresis to reduce flickering events.
10. Render overlay, update dashboard, append timeline events.
11. Adaptive controller adjusts scale or sampling when latency exceeds budget.

## Event Metadata Schema
Each exported event should include at least:
- `id`
- `start`
- `end`
- `duration`
- `bbox`
- `centroid`
- `area`
- `peakRatio`
- `roiId`
- Optional: `trackId`, `confidence`, `meanIntensity`, `maxIntensity`

## In Scope
- MP4 and browser-supported camera streams.
- Client-side processing only.
- Chrome as primary browser.
- Edge as secondary browser.
- 720p, 1080p, and 4K test resolutions.
- Rectangular ROI.
- Motion detection using grayscale, blur, frame differencing.
- Connected components, bounding boxes, centroids, simple tracking.
- Timeline, dashboard, JSON/CSV export.
- Benchmarks and reproducible measurement data.

## In Scope
- MP4 and browser-supported camera streams.
- Client-side processing only.
- Chrome as primary browser.
- Edge as secondary browser.
- 720p, 1080p, and 4K test resolutions.
- Rectangular ROI.
- Motion detection using grayscale, blur, frame differencing.
- Connected components, bounding boxes, centroids, simple tracking.
- Timeline, dashboard, JSON/CSV export.
- Benchmarks and reproducible measurement data.

## In Scope
- MP4 and browser-supported camera streams.
- Client-side processing only.
- Chrome as primary browser.
- Edge as secondary browser.
- 720p, 1080p, and 4K test resolutions.
- Rectangular ROI.
- Motion detection using grayscale, blur, frame differencing.
- Connected components, bounding boxes, centroids, simple tracking.
- Timeline, dashboard, JSON/CSV export.
- Benchmarks and reproducible measurement data.

## Implementation Priority
1. Build stable baseline: video upload, camera input, Canvas capture, overlay.
2. Isolate MotionEngine interface for WASM processing.
3. Integrate C++ WebAssembly SIMD + pthreads build.
4. Reuse buffers and reduce frame copies before adding complex features.
5. Add ROI editor and processing parameters.
6. Add motion mask, connected components, bounding boxes, centroids.
7. Add simple tracking and event rules.
8. Add dashboard, timeline, JSON/CSV export.
9. Add adaptive quality controller.
10. Add Worker/OffscreenCanvas/WebCodecs only after baseline works.
11. Add benchmarks, ground truth, and reproducible reports.

## Planning Rules For Agents
- Prefer smallest correct implementation that advances MVP.
- Preserve local-first privacy rule in all designs.
- Do not introduce backend video upload.
- Do not prioritize WebGPU, deep learning, polygon ROI, heatmap, PDF export, or WebCodecs before MVP.
- When planning work, map tasks to architecture modules: input, capture/decode, scheduling, processing core, event analysis, presentation, storage/export.
- Every feature should include validation path: manual test, unit test, benchmark, or documented limitation.
- Performance work must measure end-to-end latency, not only WASM function time.
- Keep fallback path working before adding optional browser APIs.
- Favor reproducible benchmark scripts and saved measurement data.

## Deliverables
- MotionGuard Web browser application.
- C++ WebAssembly SIMD + pthreads source.
- JavaScript/TypeScript frontend source.
- Motion mask, ROI, bounding box, tracking, and event timeline.
- Performance dashboard and JSON/CSV export.
- Functional tests, benchmark scripts, ground truth data, and results.
- Architecture, setup, usage, and experiment documentation.
- Graduation report, slides, and video/camera demo.
