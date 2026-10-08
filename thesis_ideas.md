# Ý tưởng cập nhật MotionGuard Web

Mục tiêu của file này là liệt kê các hướng phát triển có tính **đóng góp học thuật**, không chỉ là thêm tính năng giống ứng dụng ngoài thị trường.

Hiện tại điểm mới chính của dự án là **auto adaptive quality**. 

Các ý tưởng dưới đây giúp mở rộng điểm mới đó thành một hướng nghiên cứu rõ ràng hơn.

---

## 1. Adaptive Quality Controller thông minh hơn

### Ý tưởng

Nâng cấp adaptive mode hiện tại thành một bộ điều khiển tự động chọn cấu hình xử lý dựa trên hiệu năng thực tế.

Bộ điều khiển có thể tự chọn:

- độ phân giải xử lý,
- frame skipping,
- số thread WASM,
- ưu tiên ROI,
- threshold hoặc noise filter.

Mục tiêu là giữ P95 latency dưới ngưỡng thời gian thực:

```txt
33.3 ms/frame
```

### Đóng góp học thuật

- Đề xuất thuật toán adaptive cho browser-based WASM video analysis.
- So sánh adaptive mode với fixed-quality mode.
- Chứng minh adaptive mode giúp duy trì real-time tốt hơn ở 1080p và 4K.

### Metric đánh giá

- FPS.
- P95/P99 latency.
- Dropped frames.
- Độ chính xác event.
- Số lần đổi cấu hình.
- Độ ổn định UI.

### Mức độ phù hợp

Rất phù hợp để làm đóng góp chính của luận văn vì dự án đã có nền tảng adaptive resolution.

---

## 2. ROI-aware Processing

### Ý tưởng

Hiện tại hệ thống có ROI, nhưng có thể phát triển sâu hơn thành hướng **ROI-aware processing**.

Có thể so sánh ba chế độ:

| Chế độ | Cách xử lý |
| --- | --- |
| Full-frame | Xử lý toàn bộ frame. |
| ROI-filter | Xử lý toàn bộ frame nhưng chỉ lấy kết quả trong ROI. |
| ROI-first | Chỉ xử lý hoặc ưu tiên xử lý vùng ROI. |

### Đóng góp học thuật

- Đánh giá ROI-first giúp giảm latency bao nhiêu.
- Phân tích đánh đổi giữa tốc độ và độ chính xác.
- Phù hợp với surveillance vì người dùng thường chỉ quan tâm một vùng cụ thể.

### Metric đánh giá

- Latency giảm bao nhiêu phần trăm.
- FPS tăng bao nhiêu.
- Event detection accuracy có giảm hay không.
- P95/P99 latency trong từng chế độ.

---

## 3. Dynamic Thread Tuning cho WASM pthread

### Ý tưởng

Không dùng cố định 1/2/4 threads, mà tự chọn số thread theo điều kiện chạy thực tế.

Hệ thống có thể chọn thread dựa trên:

- độ phân giải video,
- latency hiện tại,
- performance history,
- browser capability,
- trạng thái adaptive quality.

### Đóng góp học thuật

- Nghiên cứu hiệu quả của pthread trong WebAssembly trên browser.
- Chứng minh không phải lúc nào nhiều thread cũng nhanh hơn.
- Đề xuất rule chọn thread tối ưu theo workload.

### So sánh cần làm

- Fixed 1 thread.
- Fixed 2 threads.
- Fixed 4 threads.
- Auto-thread.

### Metric đánh giá

- WASM engine latency.
- End-to-end latency.
- P95/P99 latency.
- UI responsiveness.

---

## 4. End-to-End Pipeline Optimization Study

### Ý tưởng

Thay vì chỉ đo thời gian WASM core, đo toàn bộ pipeline xử lý video trong browser.

Pipeline có thể tách thành:

```txt
video decode/capture
→ canvas draw
→ getImageData
→ copy to WASM
→ WASM processing
→ object detection
→ event update
→ render overlay
```

### Đóng góp học thuật

- Chỉ ra bottleneck thật trong browser video analytics.
- Chứng minh tối ưu WASM core là chưa đủ.
- Đề xuất pipeline tối ưu dựa trên đo end-to-end latency.

### So sánh cần làm

- Main-thread Canvas + WASM.
- Worker + OffscreenCanvas.
- Các mức độ phân giải khác nhau.
- Adaptive on/off.

### Giá trị học thuật

Hướng này mạnh vì có tính thực nghiệm rõ ràng, dễ trình bày trong báo cáo và dễ chứng minh bằng số liệu.

---

## 5. Browser-local Privacy-preserving Video Analytics

### Ý tưởng

Thiết kế hệ thống phân tích video hoàn toàn local trên browser.

Nguyên tắc:

- không upload video thô,
- không upload frame,
- chỉ export metadata,
- server chỉ phục vụ static assets.

### Đóng góp học thuật

- Đề xuất kiến trúc privacy-preserving cho browser-based video analytics.
- Chỉ lưu event metadata như thời gian, bbox, centroid, area.
- So sánh với mô hình cloud-based surveillance.

### Điểm nhấn

Đây không phải thuật toán quá phức tạp, nhưng có giá trị hệ thống:

- bảo vệ quyền riêng tư,
- chạy offline/local-first,
- không cần backend xử lý video,
- dễ triển khai thực tế.

---

## 6. Event Stability với Hysteresis và Tracking

### Ý tưởng

Thay vì mỗi frame có motion là tạo event, dùng các rule ổn định hơn:

- connected components,
- object tracking,
- hysteresis,
- minimum duration,
- quiet duration,
- area threshold,
- ROI rule.

### Đóng góp học thuật

- Giảm event flickering.
- Giảm false positive.
- Tạo timeline event ổn định hơn.

### Metric đánh giá

- Số event giả.
- Precision/recall.
- Temporal IoU.
- Event fragmentation rate.

Ví dụ metric hữu ích:

```txt
Event fragmentation = một chuyển động thật bị tách thành bao nhiêu event nhỏ
```

---

## 7. Benchmark Dataset và Evaluation Protocol

### Ý tưởng

Tạo một bộ benchmark nhỏ nhưng có quy trình đánh giá rõ ràng.

Dataset nên gồm:

- 720p,
- 1080p,
- 4K,
- low motion,
- high motion,
- small object,
- large object,
- noise hoặc thay đổi ánh sáng.

### Đóng góp học thuật

- Đề xuất protocol đánh giá browser-based motion analysis.
- Có ground truth event.
- Đánh giá cả hiệu năng và độ chính xác.

### Metric đánh giá

- FPS.
- P95/P99 latency.
- Dropped frames.
- Precision.
- Recall.
- Event overlap.
- Memory usage nếu browser hỗ trợ.

---

## 8. Lightweight Classical Motion Detection vs Deep Learning

### Ý tưởng

Không nhất thiết phải dùng deep learning. Có thể trình bày rõ lý do chọn classical computer vision + WASM.

Classical WASM phù hợp vì:

- nhẹ,
- không cần GPU,
- bảo vệ privacy tốt hơn,
- chạy offline,
- latency thấp,
- dễ giải thích.

### Đóng góp học thuật

- Phân tích trade-off giữa classical WASM và ML/cloud approach.
- Tập trung vào real-time, local-first và low-resource setting.

### Hướng trình bày

Không cần chứng minh classical luôn tốt hơn deep learning. Chỉ cần chứng minh nó phù hợp hơn với bài toán:

```txt
local-first browser-based real-time motion event analysis
```

---

## Hướng nên chọn làm trọng tâm luận văn

Nếu cần một hướng nghiên cứu rõ ràng, nên chọn ba đóng góp chính:

### Contribution 1

**Adaptive end-to-end quality controller for browser-based WASM motion analysis**

### Contribution 2

**ROI-aware local video analytics pipeline with latency/accuracy trade-off**

### Contribution 3

**Benchmark and evaluation protocol for local-first browser motion event detection**

Ba hướng này liên kết tốt với nhau và phù hợp với repo hiện tại.

---

## Tên đề tài gợi ý

### Tiếng Anh

```txt
A Local-First Adaptive WebAssembly Pipeline for Real-Time Browser-Based Motion Event Analysis
```

### Tiếng Việt

```txt
Hệ thống phân tích sự kiện chuyển động thời gian thực trên trình duyệt với WebAssembly và cơ chế thích ứng hiệu năng cục bộ
```

---

## Điểm mới nên nhấn mạnh

- Chạy hoàn toàn local trong browser.
- Không upload raw video hoặc frame.
- Adaptive theo end-to-end latency, không chỉ WASM core latency.
- Có ROI-aware processing.
- Có benchmark 720p/1080p/4K.
- Đánh giá cả hiệu năng và độ chính xác event.
- Có so sánh fixed quality và adaptive quality.

---

## Gợi ý thứ tự triển khai nghiên cứu

| Thứ tự | Hạng mục | Mục tiêu |
| --- | --- | --- |
| 1 | Hoàn thiện adaptive quality | Có controller ổn định và đo được. |
| 2 | Thêm ROI-aware processing | So sánh full-frame, ROI-filter và ROI-first. |
| 3 | Hoàn thiện event metadata | Export được event đầy đủ để đánh giá accuracy. |
| 4 | Xây benchmark harness | Ghi được FPS, P95/P99, dropped frames, resolution. |
| 5 | Chuẩn bị ground truth | Có dữ liệu so sánh event detection. |
| 6 | Chạy thí nghiệm | Fixed vs adaptive, main-thread vs worker, ROI modes. |
| 7 | Viết phân tích | Rút ra bottleneck, trade-off và đóng góp học thuật. |
