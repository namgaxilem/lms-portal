# Nâng cấp Moodle: lộ trình & đề xuất cho portal

> Tài liệu cho đội vận hành. Dữ liệu kiểm chứng trên source Moodle 4.1 (site HVTC hiện tại),
> cây 4.5.1 (UFM) và các nhánh `MOODLE_50x_STABLE` (tháng 11/2026).

## 1. Hiện trạng

| | |
|---|---|
| Site đang chạy | Moodle **4.1.2+** (Build 20230414) |
| Hỗ trợ bảo mật 4.1 LTS | **Đã hết từ 08/12/2025**: site không còn nhận bản vá bảo mật |
| Bản mới nhất | **5.3 LTS** (05/10/2026), vá lỗi tới 10/2027, bảo mật tới 10/2029 |

Portal chỉ gọi Moodle qua Web Service (WS) của service `moodle_mobile_app`. Mọi hàm WS portal đang dùng
đều còn ở 5.3 và không bị deprecated, trừ `mod_quiz_get_user_attempts` (deprecated từ 5.0; portal hiện không gọi).

## 2. Lộ trình nâng cấp bắt buộc

```
4.1.2  ──►  4.5 LTS  ──►  5.3 LTS
```

- 5.0/5.1 yêu cầu site từ 4.2.3 trở lên; 5.2/5.3 yêu cầu từ 4.4 trở lên. Vì vậy **phải dừng ở 4.5**.
  `environment.xml` của 4.5 nhận nâng cấp thẳng từ 4.1.2.
- Hạ tầng cho 5.3: PHP 8.3–8.4 (64-bit, sodium); PostgreSQL 17, MySQL 8.4 hoặc MariaDB 11.4.
- **5.1 có thư mục `/public`**: document root của web server phải trỏ vào `/public`. Plugin bên thứ ba phải chuyển
  thủ công. Portal gọi các đường dẫn `webservice/rest/server.php`, `login/token.php`, `webservice/pluginfile.php`,
  `webservice/upload.php`, `lib/ajax/service-nologin.php`. Các đường dẫn này vẫn giữ nguyên nếu document root
  hoặc reverse proxy được cấu hình đúng. Kiểm tra lại sau khi nâng cấp.
- **5.0 bỏ Chat và Survey khỏi core.** Hoạt động loại này sẽ biến mất khỏi khóa học, trừ khi cài lại plugin.
  Atto, MNet và auth_cas cũng bị bỏ.
- Plugin bên thứ ba có trên site 4.1 nhưng không có trong cây 4.5 cần kiểm tra bản tương thích trước khi nâng:
  theme_remui/edwiser*, local_intelliboard, mod_hsuforum, mod_hvp, format_tiles,
  block_configurable_reports, report_lpmonitoring.
- Dữ liệu SCORM được chuyển sang bảng mới ở 4.3 (`scorm_attempt`, `scorm_element`, `scorm_scoes_value`).
  Chữ ký WS không đổi nên SCORM player của portal không phải sửa. Chỉ báo cáo nào truy vấn SQL trực tiếp
  vào `mdl_scorm_scoes_track` mới phải viết lại.
- Sau mỗi bước, đăng nhập portal bằng tài khoản quản trị và kiểm tra `site_info.functions`.
  Portal tự bật hoặc tắt tính năng theo danh sách này.

## 3. Portal đã sẵn sàng cho bản mới (làm trong đợt này)

Portal được viết để **một bản build chạy được trên 4.1, 4.5 và 5.3**. Tính năng nào cần bản mới thì portal
dò qua `core_webservice_get_site_info.functions` (hook `useSiteFunctions`) rồi mới bật.

| Thay đổi của Moodle | Portal đã xử lý |
|---|---|
| `mod_assign_remove_submission` chỉ có từ 4.5 | Nút "Gỡ bài nộp" chỉ hiện khi site có hàm này. Trên 4.1, trước đây gọi hàm này sẽ báo lỗi |
| Subsection (`mod_subsection`): ẩn mặc định ở 4.5, bật mặc định từ 5.0, chỉ hiển thị inline từ 5.2 | `buildOutline()` lồng mục con vào đúng vị trí và bỏ các section "delegated" bị trả về hai lần |
| `completiondata.isoverallcomplete` (4.4+) | `isModuleDone()` dùng trường này nếu có. Hoạt động "đạt điểm nhưng trượt" được tính là hoàn thành, giống Moodle |
| Question bank thành module, cờ `candisplay` (5.0.x/5.1.1+) | `isDisplayable()` ẩn `candisplay === false` và `qbank` |
| `gradereport_user_get_grade_items.itemname` thành HTML thô (4.5) | Tên mục điểm được làm sạch trước khi hiển thị |
| `core_my_view_page` (4.3+) | Dashboard ghi log lượt xem như app Moodle, chỉ khi site có hàm |
| Global search (`core_search_get_results`, 4.3+) | Trang `/search` tự có thêm nhóm "Nội dung khóa học" khi site hỗ trợ và đã bật Global search |
| Token hết hạn, chính sách mới (`sitepolicynotagreed`), buộc đổi mật khẩu | Portal tự xóa phiên và đưa người dùng về trang đăng nhập; trang đăng nhập giải thích cần làm gì |
| Cấu hình công khai (`tool_mobile_get_public_config`) | Trang đăng nhập lấy link quên mật khẩu, thông báo bảo trì và hướng dẫn đăng nhập từ Moodle |
| Moodle trả nội dung đã lọc theo ngôn ngữ | Portal gửi `moodlewssettingfilter` và ngôn ngữ giao diện: multilang, MathJax và nhãn ngày của Moodle khớp ngôn ngữ đang chọn |
| URL Moodle, tên trường, màu sắc | Đọc lúc chạy từ biến môi trường (`MOODLE_URL`, `MOODLE_PUBLIC_URL`, `BRAND_*`): một bản build dùng cho nhiều trường |

## 4. Đề xuất tính năng sau khi lên 4.5 / 5.3

Xếp theo giá trị cho người học. Cột "Từ bản" là phiên bản Moodle tối thiểu.

| # | Đề xuất | Từ bản | WS chính | Lợi ích |
|---|---|---|---|---|
| 1 | **Trợ lý AI trong bài học**: "Tóm tắt" (4.5), "Giải thích" (5.0) trên trang nội dung | 4.5 | `aiplacement_courseassist_summarise_text`, `…_explain_text`, `core_ai_get_policy_status`, `core_ai_set_policy_status` | Học viên có trợ giúp AI mà portal không phải giữ API key. Portal phải tự hiện chính sách AI trước lần dùng đầu |
| 2 | **H5P có lưu tiến độ** (player riêng giống SCORM) | 4.2 | `mod_h5pactivity_*`, `core_xapi_statement_post`, `core_xapi_get_state`, `core_xapi_post_state` | Nội dung tương tác được theo dõi và học tiếp được ngay trong portal |
| 3 | **Tab "Tổng quan hoạt động"** trong khóa học: hạn nộp, trạng thái làm bài; với giảng viên là số bài cần chấm | 5.1 | `core_courseformat_get_overview_information` | Có sẵn bảng "việc cần làm / cần chấm", không phải ghép từ nhiều WS |
| 4 | **Tìm kiếm toàn văn** nội dung khóa học (forum, trang, tài liệu). Portal đã sẵn sàng, chỉ cần bật phía Moodle | 4.3 | `core_search_get_results` | Tìm được nội dung bài học, không chỉ tên khóa học. Moodle phải bật và index Global search |
| 5 | **Hạn chót bài kiểm tra** (quiz due date) trong lịch và dashboard | 5.3 | trường mới của quiz | Lịch học đầy đủ hơn |
| 6 | **Huy hiệu** (badges) và trang xác thực công khai | 4.1 (danh sách), 4.5 (chi tiết) | `core_badges_get_user_badges`, `core_badges_get_user_badge_by_hash` | Tạo động lực, cấp chứng nhận. HVTC đang tắt badges: cần bật trong Moodle |
| 7 | **Chính sách trang & quyền riêng tư**: chấp nhận chính sách, yêu cầu xuất/xóa dữ liệu | 4.4 | `tool_policy_*`, `tool_dataprivacy_*` | Người dùng không bị chặn khi site bật tool_policy. Đáp ứng quy định về dữ liệu cá nhân |
| 8 | **Phòng trao đổi của khóa học** (Matrix hoặc link tùy chỉnh) | 4.4 | `core_course_get_courses_by_field` (`communicationroomurl`) | Mỗi khóa học có nút vào nhóm chat |
| 9 | **Danh sách khóa học nhẹ hơn**: tham số `requiredfields`, `searchvalue` | 4.4 | `core_course_get_enrolled_courses_by_timeline_classification` | Dashboard và trang khóa học tải nhanh hơn. 4.1 từ chối tham số lạ nên phải dò phiên bản |
| 10 | **Quiz: API lượt làm mới** (trạng thái notstarted/submitted, điểm theo mục) | 4.3 / 5.0 | `mod_quiz_get_user_quiz_attempts` | Hiển thị đúng trạng thái lượt làm sau 5.0 |
| 11 | **Đăng nhập OAuth 2 hoặc personal access token** thay cho gửi mật khẩu lấy token | 5.3 | REST API mới | Portal không còn xử lý mật khẩu Moodle; hỗ trợ SSO và MFA. Cần đánh giá thêm |

Làm được ngay trên 4.1 (đã đưa vào portal đợt này):

- nút đánh dấu hoàn thành thủ công (`core_completion_update_activity_completion_status_manually`);
- trang Lịch (`core_calendar_get_calendar_monthly_view` / `_upcoming_view`).

## 5. Lưu ý dữ liệu HVTC ảnh hưởng tới trải nghiệm

- Khoảng 86% hoạt động **hoàn thành khi mở**, kể cả quiz. Vì vậy:
  - tiến độ và chuỗi ngày học phản ánh "đã mở", chưa chắc là "đã học xong";
  - Moodle gỡ sự kiện hạn chót (action event) của SCORM/quiz ngay khi hoạt động được tính hoàn thành.

  Đề xuất: với SCORM, đặt điều kiện hoàn thành theo trạng thái SCORM (completed/passed) hoặc theo điểm.
  Với quiz, đặt theo "nộp bài" hoặc "đạt điểm". Khi đó tiến độ, chuỗi ngày và hạn chót trên portal sẽ có ý nghĩa thật.
- Khóa học **không có mô tả (summary)**, và danh mục đang là tên lớp/ca. Nên bổ sung mô tả ngắn và ảnh bìa
  cho các khóa còn thiếu (27/126 khóa chưa có ảnh). Portal sẽ tự hiển thị.
- **Badges đang tắt**, xếp hạng (rank) trong bảng điểm cũng tắt. Muốn dùng đề xuất #6 thì phải bật trong Moodle.
- `MOODLE_GRADING_TOKEN` trên môi trường dev đang không hợp lệ. Màn chấm điểm sẽ chỉ chấm điểm số đơn giản
  cho tới khi tạo lại token (xem `.env.example`).
