# Trạng thái vấn đề và xử lý

File này theo dõi các vấn đề phát hiện trong quá trình phát triển và trạng thái của chúng theo repository hiện tại.

## Tuần 2 — Adaptive mode, bộ nhớ, lưu trữ, ổn định và UI

### Đã giải quyết

- UI không còn chỉ là prototype cơ bản; hiện có processing controls, chỉnh ROI, telemetry, trạng thái pipeline/browser, event timeline và export controls.
- Adaptive mode đã có các luật quyết định ban đầu dựa trên rolling P95 latency, FPS, dropped frames và các khoảng giữ ổn định.
- Thread selection không còn bị giới hạn cố định ở bốn thread; đã có chọn thủ công 1/2/4 thread và tùy chọn Auto.

### Đã giải quyết một phần

- **Adaptive mode:** đã có downshift và upshift độ phân giải, nhưng chưa có frame sampling, ưu tiên ROI và thay đổi tham số xử lý động.
- **Lưu event data:** đã có JSON và CSV export, nhưng event vẫn nằm trong React state và chưa được lưu/offload bằng IndexedDB/OPFS/FIFO retention.
- **Telemetry:** đã có FPS, WASM latency, end-to-end latency, P95 và P99. Dropped frames được thu thập nội bộ nhưng chưa hiển thị. Chưa có memory và GC pause metrics.

### Chưa giải quyết

- Chưa có cơ chế phát hiện hoặc phản ứng với áp lực JavaScript heap hay GC pause.
- Chưa có event store lâu dài, retention policy hoặc tự động xóa event cũ.
- Chưa hoàn thành kiểm thử tải tối đa hoặc kiểm thử ổn định dài hạn.
- Chưa hoàn thiện benchmark dataset hoặc ground-truth dataset.

### Kế hoạch tiếp theo

- Thêm camera input và cleanup camera track.
- Hiển thị dropped frames và trạng thái budget 33.3 ms.
- Thêm memory telemetry tùy chọn khi browser hỗ trợ API phù hợp.
- Xây kiểm thử adaptive transition và benchmark fixed-vs-adaptive ở 720p, 1080p, 4K.
- Chỉ đánh giá IndexedDB/OPFS cho event metadata; không bao giờ lưu video hoặc frame thô.

## Tuần 3 — Calibration, auto-threading và scheduling

### Đã giải quyết

- Đã dùng `requestVideoFrameCallback` khi được hỗ trợ, với `requestAnimationFrame` làm fallback.
- Đã triển khai chọn thread thủ công.
- Đã triển khai auto-thread calibration trong workflow Start.
- Đã triển khai adaptive resolution độc lập với thread selection.

### Đã giải quyết một phần

- Calibration hiện chỉ đo một frame cho mỗi candidate sau reset; chưa có warm-up frame hoặc nhiều lần đo frame-difference ổn định.
- Run ID và cleanup khi đổi source ngăn xử lý cũ tiếp tục, nhưng calibration chưa có cơ chế hủy đầy đủ giữa từng candidate.
- Auto-thread mode chưa được recalibrate động trong khi analysis đang chạy.

### Chưa giải quyết

- Auto-threading và adaptive resolution chưa có cơ chế phối hợp hoặc cooldown policy.
- Chưa có WASM equivalence test cho thresholding, reset, đổi resolution và kết quả 1/2/4 thread.
- Chưa export benchmark result để so sánh các cấu hình thread.

### Kế hoạch tiếp theo

- Thêm warm-up frame và calibration nhiều frame sử dụng P95.
- Ưu tiên ít thread hơn khi hiệu năng gần tương đương.
- Hủy calibration khi Stop, đổi source hoặc chuyển sang manual mode.
- Phối hợp auto-threading với adaptive resolution và thêm cooldown.
- Bổ sung unit test cho calibration và configuration transition.

## Tuần 6 — Worker, OffscreenCanvas và overhead pipeline

### Đã giải quyết

- Worker sử dụng bản build WASM ES module được tạo ra dưới dạng `motion_wasm_worker.mjs`.
- Đã triển khai xử lý Worker với OffscreenCanvas trong `src/workers/motionWorker.ts`.
- Main-thread Canvas + pthread WASM vẫn được giữ làm fallback.
- End-to-end latency được đo quanh capture, processing, object analysis và event update.

### Đã giải quyết một phần

- Worker sử dụng WASM không có pthread nhưng chưa được benchmark so với main-thread pthread build.
- Pipeline vẫn có nhiều bước copy/chuyển đổi: `ImageBitmap`, `OffscreenCanvas`, `getImageData` và copy vào WASM heap.
- Đã có capability detection cho OffscreenCanvas, nhưng chưa ghi lại kết quả tương thích Chrome/Edge.
- Adaptive quality có thể đổi resolution khi hiệu năng thấp nhưng chưa được xác thực với fixed-quality baseline.

### Chưa giải quyết

- Chưa có so sánh thực tế giữa main-thread WASM, Worker + OffscreenCanvas và non-pthread worker WASM.
- Chưa có báo cáo stability khi Start/Stop lặp lại hoặc chạy dài.
- Chưa lưu benchmark result dưới dạng JSON/CSV.

### Kế hoạch tiếp theo

- Benchmark cả ba processing path ở 720p, 1080p và 4K.
- Ghi FPS, latency trung bình, P95/P99, dropped frames, processing resolution, browser và hardware.
- Chỉ tối ưu capture/WASM data copy sau khi đo được tác động end-to-end.
- Kiểm thử Chrome và Edge, bao gồm fallback khi OffscreenCanvas không được hỗ trợ.
- Giữ main-thread Canvas fallback làm baseline ổn định.

## Các vấn đề còn lại liên quan nhiều phần

- Camera input chưa được triển khai; hiện mới chỉ có capability detection.
- Các event field như bbox, centroid, area, track ID và intensity vẫn dùng giá trị placeholder/derived thay vì metadata đầy đủ từ object.
- Chưa có ground-truth labeling, precision/recall, event overlap và accuracy evaluation.
- README cần bổ sung setup, usage, privacy, browser support, camera permissions, architecture và benchmark instructions.
