### Kế hoạch triển khai 15 tuần — Cập nhật theo tiến độ repository hiện tại

| Tuần | Trạng thái | Đã hoàn thành trong repository | Công việc còn lại |
| --- | --- | --- | --- |
| **1** | Một phần | Phạm vi dự án, yêu cầu, mục tiêu kiến trúc và mục tiêu hiệu năng được ghi trong `AGENTS.md` và `todo.md`. | Hoàn thiện tiêu chí đánh giá và bộ video kiểm thử 720p/1080p/4K. |
| **2** | Gần hoàn thành | Engine phát hiện chuyển động C++ và cầu nối WASM TypeScript đã được triển khai. | Ghi lại quá trình refactor TT2/Scenario 4 và xác nhận interface cuối của engine. |
| **3** | Một phần | Đã có bản build WASM SIMD + pthread; đồng thời có bản build worker ES module không dùng pthread. | Bổ sung kiểm thử WASM cho threshold, ảnh nhỏ, reset, thay đổi độ phân giải và tính tương đương 1/2/4 thread. |
| **4** | Gần hoàn thành | Các module capture, xử lý WASM, ROI, phân tích đối tượng, tracking, event, telemetry, worker và export đã được tách riêng. | Bổ sung tài liệu và sơ đồ chính thức về kiến trúc/interface. |
| **5** | Một phần | Đã triển khai upload MP4, phát video, capture bằng Canvas và overlay chuyển động. | Thêm xử lý start/stop camera trực tiếp và dọn dẹp camera track. |
| **6** | Một phần | Đã tích hợp WASM, buffer đầu vào tái sử dụng, worker processing và đo latency end-to-end. | Chạy và lưu benchmark cơ sở ở 720p, 1080p và 4K. |
| **7** | Hoàn thành | Đã triển khai ROI chuẩn hóa có thể chỉnh sửa, giới hạn threshold, chọn độ phân giải và điều khiển adaptive quality. | Xác thực hoạt động ROI bằng các video kiểm thử có kiểm soát. |
| **8** | Gần hoàn thành | Đã triển khai motion mask, lọc ROI, connected components, lọc nhiễu, bounding box và centroid. | Tính intensity từ sai khác frame nguồn và xác thực bằng video đơn giản/tổng hợp. |
| **9** | Một phần | Đã triển khai object tracking nhẹ và hysteresis cho event. | Gắn bbox, centroid, area, track và intensity thật vào event export. |
| **10** | Một phần | Đã triển khai xử lý Worker + OffscreenCanvas, worker WASM ES module và Canvas fallback. | So sánh worker với main-thread pipeline về latency, dropped frames và độ phản hồi UI. |
| **11** | Gần hoàn thành | Đã triển khai FPS, latency, P95/P99, browser status, event timeline, JSON export và CSV export. | Hiển thị dropped frames và budget status; hiển thị memory khi được hỗ trợ; cải thiện tài liệu. |
| **12** | Một phần | Adaptive resolution downshift/upshift sử dụng latency P95, FPS, dropped frames và các khoảng giữ ổn định. | Thêm frame sampling/ưu tiên ROI, bảo toàn event liên tục và so sánh fixed với adaptive quality. |
| **13** | Chưa bắt đầu | — | Xây benchmark harness, chuẩn bị ground truth và đánh giá hiệu năng/độ chính xác. |
| **14** | Chưa bắt đầu | — | Phân tích kết quả và hoàn thiện biểu đồ, tài liệu kiến trúc và nội dung báo cáo kỹ thuật. |
| **15** | Chưa bắt đầu | — | Kiểm thử cuối trên Chrome/Edge, layout mobile và stability; sửa lỗi còn lại và chuẩn bị demo. |

## Ưu tiên triển khai ngay

1. Thêm camera input và cleanup.
2. Hoàn thiện event metadata thật và các trường export.
3. Hiển thị dropped-frame count và trạng thái budget 33.3 ms.
4. Bổ sung unit test cho WASM và adaptive quality.
5. Thêm ghi benchmark lặp lại được và output JSON/CSV.
6. Tạo ground-truth data và accuracy metrics.
