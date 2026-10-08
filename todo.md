# TODO MotionGuard Web

Cập nhật: 2026-10-07

## Câu hỏi nghiên cứu

- RQ1: WebAssembly có thể SIMD kết hợp với pthread đạt xử lý thời gian thực 1080p throughput và xử lý 4K thích ứng không?
- RQ2: How do Worker, OffscreenCanvas và giảm copy ảnh hưởng thế nào đến P95/P99 latency, dropped frames và độ phản hồi UI?
- RQ3: Adaptive scaling, sampling và ROI có thể duy trì ngân sách 33.3 ms/frame tốt hơn fixed quality không?
- RQ4: Connected components, tracking và luật event có thể tạo ra timeline chính xác so với ground truth không?

## Trạng thái hiện tại

- Đã hoàn thành: ứng dụng React/Vite/TypeScript, Tailwind, COOP/COEP header cho môi trường development và preview.
- Đã hoàn thành: đầu vào MP4, phát video, capture bằng Canvas ẩn, overlay đầu ra, WASM bridge, WASM input buffer tái sử dụng, and reset detector.
- Đã hoàn thành: C++ integer grayscale, separable blur, SIMD differencing, xử lý pthread 1/2/4 thread có thể cấu hình, and bản build worker WASM không dùng pthread.
- Đã hoàn thành: ROI chuẩn hóa có thể chỉnh sửa, điều khiển kéo/thay đổi kích thước, giới hạn threshold, and resolution preset.
- Đã hoàn thành: motion mask, lọc ROI, lọc nhiễu theo diện tích tối thiểu, connected components, bounding box, centroid, and overlay đối tượng.
- Đã hoàn thành: object tracking nhẹ dựa trên centroid với ID ổn định, smoothing, xử lý frame bị bỏ qua và event hysteresis.
- Đã hoàn thành: event timeline, bảo toàn event khi stop/start, reset event khi đổi source, and đánh số event.
- Đã hoàn thành: điều khiển JSON/CSV export và unit test export; schema export vẫn cần metadata object thật.
- Đã hoàn thành: pipeline Worker + OffscreenCanvas với worker WASM ES module và Canvas fallback trên main thread.
- Đã hoàn thành: FPS, WASM latency, end-to-end latency, rolling P95/P99, thu thập dropped frame, trạng thái capability browser và telemetry resolution hiệu dụng.
- Đã hoàn thành: scheduling bằng `requestVideoFrameCallback` với `requestAnimationFrame` fallback.
- Đã hoàn thành: prototype adaptive quality dựa trên resolution sử dụng P95 latency, FPS, dropped frames và các khoảng giữ ổn định tăng/giảm.
- Một phần: đã có capability detection cho camera, nhưng chưa triển khai start/stop camera và cleanup stream.
- Một phần: đã thu thập dropped frames nhưng chưa hiển thị; chưa hiển thị trạng thái latency budget và memory telemetry.
- Một phần: các event field như bbox, centroid, area, track ID và intensity chưa được truyền đầy đủ vào event export.
- Một phần: auto-thread calibration có ở Start nhưng vẫn chỉ đo một frame mỗi candidate và chưa phối hợp động với adaptive resolution.
- Còn thiếu: benchmark harness và kết quả 720p/1080p/4K đã lưu.
- Còn thiếu: so sánh hiệu năng Worker/main-thread, ground truth, accuracy metrics, stability test dài hạn và tài liệu đầy đủ.

## Công việc tiếp theo

### 1. Ổn định MVP

- [x] Giới hạn threshold trong state từ 1-255, không chỉ qua thuộc tính input HTML.
- [x] Thu hồi video object URL trước khi chọn file khác.
- [x] Áp dụng thay đổi threshold ngay lập tức.
- [x] Dừng analysis đang chạy trước khi đổi video source.
- [x] Reset event tracker, object tracker, trạng thái WASM và kích thước xử lý khi source thay đổi.
- [x] Xử lý lỗi tải video và khởi tạo WASM.
- [ ] Căn chỉnh phép so sánh threshold theo semantics sai khác tối thiểu đã ghi tài liệu và xác minh behavior của threshold.
- [ ] Làm cho chiều rộng timeline cố định responsive hoàn toàn dưới 800px.
- [ ] Chạy `npm run build` và ghi lại kết quả.

### 2. Thêm camera input

- [ ] Thêm điều khiển start/stop camera.
- [ ] Sử dụng `navigator.mediaDevices.getUserMedia({ video: true })`.
- [ ] Gắn `MediaStream` của camera vào video element.
- [ ] Dừng camera track khi đổi source, dừng camera hoặc unmount.
- [ ] Reset event và metrics khi chuyển giữa file source và camera source.
- [ ] Giữ nguyên local-first: không upload video, frame hoặc dữ liệu camera.
- [ ] Xử lý lỗi từ chối quyền và camera không được hỗ trợ.
- [ ] Xác thực camera mode trên Chrome và Edge.

### 3. ROI có thể chỉnh sửa

- [x] Giữ ROI ở dạng chuẩn hóa `{ x, y, width, height }`, giới hạn từ 0-1.
- [x] Thêm kéo để di chuyển và handle thay đổi kích thước trong `VideoStage`.
- [x] Giữ state/cách tính ROI trong hook và `src/features/roi.ts`.
- [ ] Xác nhận motion percentage thay đổi khi ROI bao gồm/loại trừ chuyển động.
- [ ] Thêm video kiểm thử ROI thủ công hoặc test tổng hợp.

### 4. Cải thiện telemetry

- [x] Theo dõi các mẫu frame-latency rolling có giới hạn.
- [x] Tính FPS, latency mới nhất, P95 và P99.
- [x] Đo latency toàn pipeline qua capture, phát hiện object và cập nhật event.
- [x] Thu thập dropped-frame count khi browser cung cấp thông tin chất lượng phát video.
- [x] Show browser capabilities: `crossOriginIsolated`, `SharedArrayBuffer`, WebAssembly, camera, and OffscreenCanvas.
- [ ] Hiển thị dropped-frame count trong telemetry panel.
- [ ] Hiển thị trạng thái budget 33.3 ms dựa trên P95 latency của toàn pipeline.
- [ ] Tính/hiển thị decoded-frame rate khi được hỗ trợ.
- [ ] Chỉ hiển thị memory khi browser cung cấp API sử dụng được.
- [ ] Thêm trạng thái Worker/fallback và trạng thái lỗi rõ ràng vào dashboard.

### 5. Phát hiện đối tượng chuyển động

- [x] Giữ WASM motion mask làm baseline xử lý.
- [x] Thêm bước connected-components bằng TypeScript trên mask.
- [x] Tính bounding box, centroid và area.
- [x] Lọc nhiễu theo diện tích tối thiểu và giao với ROI.
- [x] Render overlay bounding box và centroid.
- [ ] Tính intensity có ý nghĩa từ sai khác frame nguồn, không dùng giá trị binary mask.
- [ ] Xác thực detection bằng video đơn giản/tổng hợp trước khi tối ưu.
- [ ] Xác nhận ngưỡng diện tích object nhất quán giữa các processing resolution.

### 6. Theo dõi đối tượng và event

- [x] Ghép blob giữa các frame bằng khoảng cách centroid.
- [x] Gán track ID ổn định qua các frame.
- [x] Làm mượt tọa độ object được tracking và cho phép frame bị bỏ qua.
- [x] Thêm hysteresis dựa trên thời lượng cho lúc bắt đầu event và khoảng yên lặng trước khi kết thúc event.
- [ ] Cải thiện matching bằng độ tương đồng diện tích cùng với khoảng cách centroid.
- [ ] Mở rộng event với `id`, `start`, `end`, `duration`, `bbox`, `centroid`, `area`, `peakRatio`, `roiId`, `trackId`, `meanIntensity` và `maxIntensity` thật.
- [x] Đưa event mới bắt đầu lên đầu danh sách event.
- [x] Bảo toàn event qua các lần stop/start.
- [x] Reset event khi chọn video mới.
- [ ] Bảo toàn track/event đang hoạt động qua các lần chuyển adaptive quality.

### 7. Export metadata

- [x] Thêm điều khiển JSON và CSV export gần timeline.
- [x] Chỉ export metadata, không bao giờ export video hoặc pixel thô.
- [x] Thêm JSON có version và các cột CSV ổn định.
- [ ] Thay các giá trị placeholder bbox, centroid, area, track và intensity bằng event metadata thật.
- [ ] Xác thực output đầy đủ theo event schema trong `AGENTS.md`.
- [x] Thêm unit test cho thứ tự JSON, cột CSV, escaping và export rỗng.
- [ ] Thêm test cho event chứa đầy đủ metadata thật.

### 8. Benchmark baseline

- [ ] Chuẩn bị và ghi tài liệu cho các clip 720p, 1080p và 4K đại diện.
- [ ] Thêm benchmark mode lặp lại được, ghi resolution, browser, hardware, threshold, ROI, FPS, latency trung bình/P95/P99 và dropped frames.
- [ ] Lưu kết quả dạng JSON/CSV tại đường dẫn results được ghi tài liệu.
- [ ] Dùng main-thread Canvas + pthread WASM làm baseline cho RQ1.
- [ ] Chạy benchmark fixed quality ở 720p, 1080p và 4K.
- [ ] Ghi lại việc P95 có đạt mục tiêu 33.3 ms/frame hay không.

### 9. Thêm adaptive quality

- [x] Thêm resolution ladder adaptive từ 360p đến 4K.
- [x] Giảm resolution sau khi P95 rolling vượt budget liên tục.
- [x] Tăng lại resolution từng bước sau khi latency thấp ổn định.
- [x] Hiển thị resolution hiệu dụng hiện tại.
- [ ] Khôi phục resolution được yêu cầu khi tắt adaptive mode.
- [ ] Chuẩn hóa ngưỡng diện tích object giữa các processing resolution.
- [ ] Bảo toàn tính liên tục của event/tracking khi đổi processing resolution.
- [ ] Thêm cooldown giữa các lần đổi resolution.
- [ ] Thêm frame sampling tùy chọn khi latency vẫn vượt budget.
- [ ] So sánh fixed quality với adaptive quality cho RQ3.
- [ ] Thêm unit test cho downshift, upshift, hold window, cooldown và các preset biên.

### 10. Auto-threading và xác thực WASM

- [x] Hỗ trợ chọn thủ công 1, 2 và 4 thread.
- [x] Cung cấp workflow tự chọn thread ở bước Start.
- [ ] Thêm warm-up frame cho calibration.
- [ ] Đo nhiều frame-difference thực tế cho mỗi candidate và chọn bằng P95.
- [ ] Ưu tiên ít thread hơn khi hiệu năng gần tương đương.
- [ ] Hủy calibration khi Stop, đổi source hoặc chọn manual mode.
- [ ] Phối hợp thay đổi thread với thay đổi adaptive resolution.
- [ ] Kiểm thử thresholding, ảnh nhỏ, behavior reset, đổi resolution và tính tương đương kết quả 1/2/4 thread.
- [ ] Thêm cooldown giữa các lần đổi cấu hình.

### 11. Đánh giá worker path

- [x] Triển khai processing path Worker + OffscreenCanvas.
- [x] Generate/load worker WASM ES module (`motion_wasm_worker.mjs`).
- [x] Giữ main-thread Canvas fallback hoạt động.
- [ ] Đo riêng overhead của ImageBitmap, OffscreenCanvas, `getImageData`, WASM-copy, engine và analysis.
- [ ] So sánh main-thread pthread WASM, Worker + OffscreenCanvas và worker WASM không pthread.
- [ ] So sánh P95/P99, dropped frames và độ phản hồi UI cho RQ2.
- [ ] Kiểm thử behavior fallback trên Chrome và Edge.
- [ ] Chỉ giữ worker path nếu số liệu chứng minh complexity tăng thêm là đáng giá.

### 12. Độ chính xác và ground truth

- [ ] Gắn nhãn thời gian bắt đầu/kết thúc event ground truth cho các clip được chọn.
- [ ] Gắn nhãn vùng chuyển động hoặc bounding box ground truth khi cần.
- [ ] Định nghĩa luật matching và overlap của event.
- [ ] Tính precision, recall, false positives và false negatives.
- [ ] Tính event-overlap hoặc temporal IoU metrics cho RQ4.
- [ ] Phân tích false positive do nhiễu, ánh sáng hoặc camera chuyển động.
- [ ] Phân tích false negative do threshold, ROI hoặc cài đặt kích thước object.

### 13. Tài liệu và demo cuối

- [ ] Cập nhật README với hướng dẫn setup và build.
- [ ] Ghi tài liệu về upload, quyền camera, ROI, threshold, resolution, adaptive mode và cách export.
- [ ] Ghi tài liệu về privacy local-first và việc video thô không bao giờ được upload.
- [ ] Ghi tài liệu về hỗ trợ Chrome/Edge và yêu cầu COOP/COEP.
- [ ] Ghi tài liệu về kiến trúc và processing pipeline.
- [ ] Ghi tài liệu về phương pháp benchmark và format kết quả.
- [ ] Thêm biểu đồ/bảng kết quả benchmark vào tài liệu báo cáo.
- [ ] Chuẩn bị demo gồm upload, camera, ROI, event, export, adaptive mode và benchmark.

## Quy tắc xác thực

- Thay đổi TypeScript/UI/config: chạy `npm run build`.
- Thay đổi C++ WASM: chạy `npm run build:wasm`, sau đó `npm run build`.
- Thay đổi test: chạy `npm run test`.
- Verify upload, mask, FPS, latency, ROI motion, and events.
- Verify stop/start preserves events and resumes playback.
- Verify a new video or camera source resets events correctly.
- Verify camera tracks stop during source change, camera stop, and unmount.
- Verify export contains metadata only and matches the documented schema.
- Verify adaptive mode changes resolution without corrupting tracking/event state.
- Check desktop and widths below 800px.

## Ràng buộc

- Không chỉnh sửa thủ công các file được generate trong `public/wasm`.
- Không thêm upload backend hoặc xử lý frame phía server.
- Defer WebGPU, deep learning, polygon ROI, heatmap, PDF export, and WebCodecs.
- Đo latency end-to-end, không chỉ thời gian WASM core.
- Preserve the Canvas fallback before optimizing the Worker path.
