# Thesis Plan — Adaptive End-to-End Quality Controller for Browser-based WASM Motion Analysis

## 1. Hướng nghiên cứu chính

Tên hướng nghiên cứu đề xuất:

```txt
Adaptive End-to-End Quality Controller for Browser-based WebAssembly Motion Analysis
```

Tên tiếng Việt:

```txt
Bộ điều khiển chất lượng thích ứng end-to-end cho phân tích chuyển động bằng WebAssembly trên trình duyệt
```

Mục tiêu là phát triển MotionGuard Web từ một ứng dụng phát hiện chuyển động thành một hệ thống nghiên cứu có khả năng **tự điều chỉnh cấu hình xử lý** để duy trì phân tích gần thời gian thực trong trình duyệt.

Trọng tâm không chỉ là tối ưu WASM core, mà là tối ưu toàn bộ pipeline:

```txt
video frame
→ canvas capture
→ pixel readback
→ copy vào WASM
→ WASM motion processing
→ object detection
→ event update
→ UI/overlay/telemetry
```

---

## 2. Repo hiện tại đã có gì

| Thành phần | Trạng thái hiện tại | Ý nghĩa với thesis |
| --- | --- | --- |
| Web app React/Vite/TypeScript | Đã có | Nền tảng giao diện và pipeline browser. |
| C++ WASM motion engine | Đã có | Core xử lý chuyển động bằng grayscale, blur, frame differencing, SIMD. |
| pthread WASM main build | Đã có | Cho phép nghiên cứu ảnh hưởng số thread. |
| Worker + OffscreenCanvas path | Đã có | Có thể so sánh main-thread và worker pipeline. |
| Resolution presets | Đã có từ 360p đến 4K | Cơ sở cho adaptive resolution. |
| Adaptive quality prototype | Đã có | Đã downshift/upshift resolution dựa trên P95/FPS/dropped frames. |
| End-to-end latency | Đã đo | Rất quan trọng vì thesis tập trung end-to-end, không chỉ WASM core. |
| Rolling P95/P99 | Đã có | Có thể dùng làm tín hiệu điều khiển. |
| Dropped-frame collection | Đã có nhưng chưa hiển thị đầy đủ | Có thể dùng làm tín hiệu quá tải. |
| Auto-thread cơ bản | Đã có | Có thể mở rộng thành dynamic thread tuning. |
| ROI | Đã có | Có thể mở rộng thành ROI-aware adaptive strategy. |
| Object/event pipeline | Đã có một phần | Cần để đánh giá accuracy khi adaptive thay đổi chất lượng. |
| Benchmark harness | Chưa có | Cần xây để có số liệu thesis. |
| Ground truth/accuracy evaluation | Chưa có | Cần để đánh giá trade-off latency/accuracy. |

---

## 3. Khoảng trống cần lấp để thành đóng góp

Hiện tại repo đã có adaptive resolution, nhưng để đạt mức đóng góp học thuật cần nâng cấp thành một bộ điều khiển có thiết kế, metric và evaluation rõ ràng.

### Các điểm còn thiếu chính

| Thiếu sót | Vì sao quan trọng |
| --- | --- |
| Adaptive logic đang nằm trực tiếp trong `useMotionAnalysis` | Khó test, khó trình bày như thuật toán độc lập. |
| Chỉ adaptive resolution | Chưa đủ mới; nên thêm frame sampling, thread tuning hoặc ROI priority. |
| Chưa có cooldown rõ ràng | Có thể gây dao động cấu hình nếu video/latency biến động. |
| Chưa có benchmark mode | Không có số liệu lặp lại được cho luận văn. |
| Chưa có fixed-vs-adaptive comparison | Chưa chứng minh adaptive tốt hơn baseline. |
| Chưa có accuracy metric | Adaptive giảm tải có thể làm giảm độ chính xác; cần đo trade-off. |
| Dropped frames chưa hiển thị đầy đủ | Mất một tín hiệu quan trọng của realtime performance. |
| Auto-thread calibration còn đơn giản | Chưa đủ mạnh để gọi là dynamic tuning. |

---

## 4. Câu hỏi nghiên cứu đề xuất

### RQ1

Adaptive controller dựa trên end-to-end latency có duy trì P95 latency dưới 33.3 ms/frame tốt hơn fixed-quality processing không?

### RQ2

Việc kết hợp adaptive resolution, frame sampling và thread tuning ảnh hưởng thế nào đến FPS, P95/P99 latency và dropped frames?

### RQ3

Adaptive quality làm thay đổi độ chính xác event detection như thế nào so với fixed quality?

### RQ4

Trong browser-based WASM motion analysis, bottleneck chính nằm ở WASM core hay ở các bước capture/copy/render của pipeline?

---

## 5. Đóng góp học thuật dự kiến

### Contribution 1 — Adaptive end-to-end controller

Thiết kế bộ điều khiển tự động thay đổi cấu hình dựa trên:

- P95 end-to-end latency,
- FPS,
- dropped frames,
- current processing resolution,
- optional thread count,
- optional frame sampling rate.

### Contribution 2 — Latency/accuracy trade-off analysis

Đánh giá adaptive quality không chỉ bằng tốc độ mà còn bằng độ chính xác event:

- precision,
- recall,
- temporal overlap,
- event fragmentation.

### Contribution 3 — Browser WASM pipeline benchmark

Xây benchmark protocol cho local-first browser motion analysis:

- 720p,
- 1080p,
- 4K,
- fixed quality,
- adaptive quality,
- main-thread WASM,
- Worker + OffscreenCanvas.

---

## 6. Thiết kế adaptive controller cần triển khai

### 6.1 Input signals

Controller nên nhận các tín hiệu sau:

| Tín hiệu | Ý nghĩa |
| --- | --- |
| `endToEndLatency` | Latency của toàn pipeline frame hiện tại. |
| `p95Latency` | Tín hiệu chính để quyết định có vượt budget không. |
| `p99Latency` | Phát hiện spike nghiêm trọng. |
| `fps` | Kiểm tra throughput thực tế. |
| `droppedFrames` | Dấu hiệu browser/video pipeline bị quá tải. |
| `processingResolution` | Cấu hình chất lượng hiện tại. |
| `threadCount` | Cấu hình parallelism hiện tại. |
| `frameSamplingRate` | Có xử lý mọi frame hay bỏ bớt frame. |

### 6.2 Output actions

Controller có thể tạo ra các action:

| Action | Mục đích |
| --- | --- |
| Downscale resolution | Giảm workload nhanh nhất. |
| Upscale resolution | Khôi phục chất lượng khi hệ thống ổn định. |
| Increase frame sampling | Bỏ bớt frame khi quá tải nặng. |
| Decrease frame sampling | Khôi phục xử lý nhiều frame hơn khi ổn định. |
| Change thread count | Điều chỉnh parallelism của WASM. |
| Keep current config | Tránh đổi cấu hình quá thường xuyên. |

### 6.3 Controller policy đề xuất

Chính sách điều khiển ban đầu:

```txt
Nếu P95 > 33.3 ms * alpha hoặc FPS < 25.5 hoặc droppedFrames tăng:
    tăng overload counter
    nếu overload counter đủ lớn:
        giảm resolution hoặc tăng frame sampling

Nếu P95 < 33.3 ms * beta và FPS gần 30 và droppedFrames = 0:
    tăng healthy counter
    nếu healthy counter đủ lớn:
        tăng resolution hoặc giảm frame sampling

Sau mỗi lần đổi cấu hình:
    reset latency window
    áp dụng cooldown
```

Trong đó:

```txt
alpha > 1.0
beta < 1.0
```

Ví dụ:

```txt
alpha = 1.1
beta = 0.8
budget = 33.3 ms
```

### 6.4 Trạng thái controller cần lưu

| State | Mục đích |
| --- | --- |
| currentResolution | Resolution đang xử lý. |
| requestedResolution | Resolution user chọn. |
| frameSamplingRate | Xử lý mỗi frame hay mỗi N frame. |
| slowWindows | Đếm số window quá tải liên tiếp. |
| fastWindows | Đếm số window khỏe liên tiếp. |
| cooldownUntil | Không đổi cấu hình trước thời điểm này. |
| lastAction | Ghi action cuối để phân tích. |

---

## 7. Những phần cần triển khai trong repo

### Phase 1 — Tách adaptive controller thành module riêng

| Task | Mục tiêu | Trạng thái |
| --- | --- | --- |
| Tạo module adaptive controller | Tách logic khỏi `useMotionAnalysis` để dễ test | [ ] |
| Định nghĩa input/output type | Có schema rõ cho controller | [ ] |
| Viết unit test cho downshift/upshift | Chứng minh controller hoạt động đúng | [ ] |
| Thêm cooldown | Tránh dao động cấu hình | [ ] |
| Khôi phục resolution khi tắt adaptive | Tôn trọng lựa chọn của user | [ ] |

### Phase 2 — Mở rộng action của controller

| Task | Mục tiêu | Trạng thái |
| --- | --- | --- |
| Thêm frame sampling | Giảm workload khi 4K hoặc quá tải nặng | [ ] |
| Thêm sampling telemetry | Biết đang xử lý mỗi frame hay bỏ frame | [ ] |
| Chuẩn hóa object-area threshold theo resolution | Giữ detection ổn định khi scale đổi | [ ] |
| Nghiên cứu thread tuning | Tích hợp 1/2/4 thread vào policy | [ ] |
| Thêm policy ưu tiên: resolution trước, sampling sau | Giữ chất lượng ổn định hơn | [ ] |

### Phase 3 — Benchmark harness

| Task | Mục tiêu | Trạng thái |
| --- | --- | --- |
| Tạo benchmark mode | Chạy đo trong thời gian/clip cố định | [ ] |
| Ghi benchmark result JSON | Dữ liệu máy đọc được | [ ] |
| Ghi benchmark result CSV | Dễ đưa vào báo cáo | [ ] |
| Lưu config mỗi lần chạy | Biết threshold, ROI, resolution, adaptive state | [ ] |
| Lưu browser/hardware info nếu có | Giúp tái lập thí nghiệm | [ ] |

### Phase 4 — Evaluation accuracy

| Task | Mục tiêu | Trạng thái |
| --- | --- | --- |
| Chuẩn bị clip 720p/1080p/4K | Dataset benchmark | [ ] |
| Gắn nhãn event ground truth | Có cơ sở đo accuracy | [ ] |
| Tính precision/recall | Đánh giá event detection | [ ] |
| Tính temporal overlap | Đánh giá timeline event | [ ] |
| Tính event fragmentation | Đo event bị chia nhỏ | [ ] |

---

## 8. Thí nghiệm cần chạy

### Experiment 1 — Fixed vs Adaptive

Mục tiêu: chứng minh adaptive controller cải thiện realtime performance.

| Cấu hình | Mô tả |
| --- | --- |
| Fixed 1080p | Luôn xử lý 1080p. |
| Fixed 720p | Luôn xử lý 720p. |
| Adaptive resolution | Controller tự down/up resolution. |
| Adaptive resolution + sampling | Controller dùng cả resolution và frame sampling. |

Metric:

- FPS trung bình,
- P95 latency,
- P99 latency,
- dropped frames,
- % thời gian dưới 33.3 ms,
- số lần đổi cấu hình.

### Experiment 2 — 720p/1080p/4K workload

Mục tiêu: đánh giá controller dưới các mức tải khác nhau.

| Video | Mục đích |
| --- | --- |
| 720p | Workload nhẹ. |
| 1080p | Target chính 30 FPS. |
| 4K | Workload nặng, kiểm tra adaptive. |

### Experiment 3 — Main-thread vs Worker

Mục tiêu: xác định pipeline nào phù hợp hơn cho adaptive controller.

| Pipeline | Mục tiêu so sánh |
| --- | --- |
| Main-thread Canvas + pthread WASM | Baseline hiệu năng engine tốt hơn. |
| Worker + OffscreenCanvas + non-pthread WASM | Giảm blocking UI nhưng có copy overhead. |

Metric:

- end-to-end latency,
- WASM latency,
- UI responsiveness,
- dropped frames,
- stability.

### Experiment 4 — Accuracy trade-off

Mục tiêu: kiểm tra adaptive có làm giảm độ chính xác event không.

So sánh:

- fixed quality,
- adaptive resolution,
- adaptive resolution + sampling.

Metric:

- precision,
- recall,
- temporal IoU,
- event fragmentation.

---

## 9. Metric chính cho luận văn

### Performance metrics

| Metric | Ý nghĩa |
| --- | --- |
| Average FPS | Throughput trung bình. |
| Mean latency | Latency trung bình. |
| P95 latency | Metric chính cho realtime stability. |
| P99 latency | Đo spike nặng. |
| Dropped frames | Đo quá tải video/browser. |
| Budget compliance | % frame/window đạt dưới 33.3 ms. |
| Configuration changes | Số lần controller đổi cấu hình. |

### Accuracy metrics

| Metric | Ý nghĩa |
| --- | --- |
| Precision | Bao nhiêu event detect là đúng. |
| Recall | Bao nhiêu event thật được detect. |
| Temporal overlap | Event detect trùng ground truth bao nhiêu. |
| Event fragmentation | Một event thật bị chia thành bao nhiêu event nhỏ. |

---

## 10. Kết quả kỳ vọng

Kết quả kỳ vọng cho thesis:

1. Adaptive controller giảm P95 latency so với fixed 1080p/4K.
2. Adaptive controller tăng tỷ lệ frame/window đạt budget 33.3 ms.
3. Adaptive controller giữ UI responsive tốt hơn ở workload nặng.
4. Accuracy giảm ít hoặc nằm trong mức chấp nhận được.
5. End-to-end bottleneck được phân tích rõ, không chỉ đo WASM core.

---

## 11. Outline chương luận văn đề xuất

### Chương 1 — Giới thiệu

- Bối cảnh browser-based video analytics.
- Vấn đề realtime và privacy.
- Mục tiêu luận văn.
- Đóng góp chính.

### Chương 2 — Cơ sở lý thuyết

- Motion detection cổ điển.
- WebAssembly, SIMD, pthread.
- Browser video pipeline.
- Adaptive quality control.

### Chương 3 — Thiết kế hệ thống

- Kiến trúc MotionGuard Web.
- WASM motion engine.
- ROI/object/event pipeline.
- Telemetry pipeline.
- Adaptive controller design.

### Chương 4 — Triển khai

- React/Vite frontend.
- C++ WASM engine.
- Controller module.
- Benchmark harness.
- Export/evaluation tools.

### Chương 5 — Thực nghiệm và đánh giá

- Dataset và ground truth.
- Fixed vs adaptive.
- 720p/1080p/4K.
- Main-thread vs Worker.
- Accuracy trade-off.

### Chương 6 — Kết luận

- Tổng kết kết quả.
- Hạn chế.
- Hướng phát triển tiếp theo.

---

## 12. Thứ tự làm đề xuất

| Thứ tự | Việc cần làm | Lý do ưu tiên |
| --- | --- | --- |
| 1 | Tách adaptive controller thành module riêng | Đây là lõi nghiên cứu. |
| 2 | Thêm unit test cho controller | Cần chứng minh policy đúng. |
| 3 | Thêm cooldown và restore resolution | Làm controller ổn định hơn. |
| 4 | Thêm frame sampling | Tăng tính mới so với adaptive resolution đơn giản. |
| 5 | Hiển thị dropped frames và budget status | Cần cho demo và phân tích. |
| 6 | Xây benchmark harness | Cần số liệu cho luận văn. |
| 7 | Chạy fixed vs adaptive | Thí nghiệm quan trọng nhất. |
| 8 | Thêm ground truth và accuracy metrics | Chứng minh trade-off. |
| 9 | So sánh main-thread vs worker | Bổ sung chiều sâu hệ thống. |
| 10 | Viết tài liệu và biểu đồ kết quả | Hoàn thiện báo cáo. |

---

## 13. Tiêu chí hoàn thành tối thiểu

Để hướng thesis này đủ mạnh, tối thiểu cần có:

- [ ] Controller module riêng.
- [ ] Adaptive resolution ổn định với cooldown.
- [ ] Frame sampling adaptive.
- [ ] Telemetry hiển thị P95/P99, dropped frames, budget status.
- [ ] Benchmark JSON/CSV.
- [ ] So sánh fixed vs adaptive ở 720p/1080p/4K.
- [ ] Ít nhất một accuracy metric dựa trên ground truth.
- [ ] Biểu đồ kết quả trong báo cáo.
