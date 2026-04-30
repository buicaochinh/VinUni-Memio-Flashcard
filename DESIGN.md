---
name: Memio
description: "Học thông minh hơn với flashcards AI và spaced repetition."
colors:
  primary-friendly-royal: "hsl(221 83% 53%)"
  primary-friendly-royal-dark: "hsl(217 91% 60%)"
  background: "hsl(0 0% 100%)"
  background-dark: "hsl(0 0% 5%)"
  foreground: "hsl(0 0% 9%)"
  foreground-dark: "hsl(0 0% 95%)"
  surface: "hsl(0 0% 100%)"
  surface-muted: "hsl(0 0% 98%)"
  surface-raised: "hsl(0 0% 100%)"
  surface-dark: "hsl(0 0% 9%)"
  surface-muted-dark: "hsl(0 0% 13%)"
  surface-raised-dark: "hsl(0 0% 11%)"
  border: "hsl(0 0% 80%)"
  border-dark: "hsl(0 0% 25%)"
  muted: "hsl(0 0% 96%)"
  muted-dark: "hsl(0 0% 13%)"
  success: "hsl(142 76% 36%)"
  danger: "hsl(0 72% 51%)"
  warning: "hsl(38 92% 50%)"
  info: "hsl(221 83% 53%)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    fontSize: "clamp(1.65rem, 3.8vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.04em"
rounded:
  sm: "12px"
  md: "14px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary-friendly-royal}"
    textColor: "hsl(0 0% 100%)"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-friendly-royal}"
    textColor: "hsl(0 0% 100%)"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "hsl(0 0% 100% / 0.70)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
  select-trigger:
    backgroundColor: "hsl(0 0% 100% / 0.70)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  container-surface:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "24px 24px"
  surface-acrylic:
    backgroundColor: "hsl(0 0% 100% / 0.70)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "24px 24px"
---

# Design System: Memio

## 1. Overview

**Creative North Star: "Bạn học đồng hành"**

Memio là một công cụ học tập, nhưng cảm giác sử dụng nên giống một bạn học ngồi cạnh: nhẹ nhàng, rõ ràng, luôn kéo sự chú ý về bước tiếp theo. Hệ UI ưu tiên nhịp ôn hằng ngày, quyết định nhanh, và sự tự tin của người học, không phải “trang trí cho vui”.

Từ PRODUCT.md: *“Ấm áp, tạo động lực, thân thiện”, “tôn trọng sự tập trung, không lòe loẹt”, và tránh cảm giác “enterprise lạnh”.* Vì vậy, thiết kế dùng nền trung tính sạch, màu nhấn có chủ ý, và copy ngắn để giữ dòng chảy học tập.

**Key Characteristics:**
- **Warm utility**: thân thiện nhưng kỷ luật, mỗi khối thông tin đều có lý do tồn tại.
- **Low-noise structure**: phân lớp bằng viền/ring và nền lớp, không phụ thuộc shadow nặng.
- **Action-forward**: trạng thái và hành động kế tiếp luôn dễ thấy.

## 2. Colors

Bảng màu trung tính sạch với một màu nhấn xanh “Friendly Royal”, dùng để dẫn mắt và thể hiện hành động quan trọng.

### Primary
- **Friendly Royal** (`hsl(221 83% 53%)`, legacy `#2563eb`): nút chính, icon nhấn, links, trạng thái “đang đúng hướng”.
- **Friendly Royal (Dark)** (`hsl(217 91% 60%)`, legacy `#3b82f6`): cùng vai trò ở dark mode, giữ độ sáng để vẫn “ấm” thay vì lạnh.

### Neutral
- **Canvas** (`hsl(0 0% 100%)` / `hsl(0 0% 5%)`): nền trang.
- **Surface** (`hsl(0 0% 100%)` / `hsl(0 0% 9%)`): khối nội dung chính.
- **Surface Muted** (`hsl(0 0% 98%)` / `hsl(0 0% 13%)`): lớp phụ, callout nhẹ.
- **Border** (`hsl(0 0% 80%)` / `hsl(0 0% 25%)`): viền phân lớp, dùng mảnh và đều.

### Semantic
- **Success** (`hsl(142 76% 36%)`): phản hồi tốt, xu hướng tích cực.
- **Warning** (`hsl(38 92% 50%)`): cảnh báo nhẹ, ưu tiên nhắc hành động.
- **Danger** (`hsl(0 72% 51%)`): lỗi hoặc rủi ro rõ ràng.

### Named Rules
**The Warm Utility Rule.** Màu nhấn dùng để dẫn hành động và trạng thái, không dùng để “làm đẹp” nền hoặc trang trí tràn màn hình.

## 3. Typography

**Font chính (UI + nội dung): Plus Jakarta Sans** (fallback hệ thống)  
Một family duy nhất để giữ nhịp đọc nhanh, giảm tải nhận thức khi chuyển ngữ cảnh giữa “thao tác” và “đọc”.

**Character:** rõ, thân thiện, tối giản. Trọng tâm là khả năng đọc nhanh và giữ nhịp học.

### Hierarchy
- **Display** (700, clamp, lh 1.15): tiêu đề trang và điểm nhấn chính.
- **Headline** (600, 18px-ish): tiêu đề section.
- **Title** (600, 16px-ish): tiêu đề card/khối con.
- **Body** (400, ~15px, lh 1.55): nội dung mô tả, hướng dẫn, phân tích.
- **Label** (600, ~12–13px, tracking 0.04em): nhãn nhỏ, metadata, badge.

### Named Rules
**The No-Shout Rule.** Tránh in hoa dày đặc và `font-black` làm mặc định, chỉ tăng trọng lượng ở điểm thật sự quan trọng.

### Text System (Low-fatigue)
Các quy tắc “đọc sâu” được chuẩn hoá ở `globals.css` để toàn app nhất quán:
- **Headings** cân bằng dòng (balance) và tracking nhẹ, ưu tiên nhịp đọc (không gào).
- **Đoạn văn** line-height rộng hơn để đọc lâu ít mỏi.
- **Số liệu** dùng `tabular-nums` ở các chỗ hiển thị %/count quan trọng.

## 4. Elevation

Hybrid: **ring/viền rõ là cấu trúc**, shadow **rất nhẹ** chỉ để tách lớp khi cần (hover hoặc surface quan trọng). Những bề mặt “premium” dùng **acrylic/mica tiết chế** (nền bán trong, blur giới hạn phạm vi) để tạo cảm giác hiện đại, nhưng không biến toàn bộ UI thành glassmorphism.

### Named Rules
**The Ring-First Rule.** Khi cần phân lớp, ưu tiên viền/ring và nền lớp trước, shadow chỉ là phụ trợ.
**The Acrylic-On-Purpose Rule.** Acrylic chỉ dùng cho vùng điều hướng hoặc vùng tổng quan, không phủ mọi card trong mọi màn hình.
**The Mica Canvas Rule.** Nền trang có “mica tint” rất nhẹ (radial gradients) để tạo chiều sâu, nhưng content surfaces vẫn ưu tiên rõ và sạch.

## 5. Components

### Buttons
- **Character:** chắc tay, thân thiện, không “kêu”.
- **Shape:** rounded 12px (mềm, dễ gần).
- **Primary:** nền `primary`, chữ trắng; padding khoảng `12px 16px`.
- **Secondary / Ghost:** nền bán trong (acrylic nhẹ) + ring rõ, dùng cho hành động phụ.
- **Hover / Focus / Active:** hover rất nhẹ; focus ring rõ ràng; active có phản hồi nhấn (dịch 1px). Tôn trọng `prefers-reduced-motion`.

### Cards / Containers
- **Corner Style:** 16px (khối lớn), 12–14px (khối con).
- **Background:** `surface` / `surface-raised`; `surface-muted` cho khối phụ.
- **Border:** dùng `border` mảnh để tạo cấu trúc; tránh viền dày hoặc trang trí.
- **Padding:** 24px cho section chính, 16px cho khối con.
- **Micro-interaction:** “reveal highlight” (radial nhẹ theo pointer) dùng như tín hiệu chất lượng, nhưng phải tắt/giảm khi `prefers-reduced-motion`.

### Inputs / Fields
- **Style:** nền `background`/`surface`, viền `input`/`border`.
- **Focus:** ring theo `ring`, không glow mạnh.
- **Error:** dùng `danger`, ưu tiên copy hướng dẫn hành động.

### Select / Dropdown (Radix)
- **Implementation:** ưu tiên `@radix-ui/react-select` để tránh dropdown native bị lệch style trên macOS/Windows.
- **Trigger:** giống button secondary (acrylic nhẹ + ring).
- **Menu:** nền `surface` + border; item highlighted dùng `muted`, item selected có indicator (check).
- **Width behavior:** dropdown **tối thiểu** bằng trigger (`min-width` theo trigger width), nhưng **có thể rộng hơn** nếu option dài để tránh bị cắt chữ.

### Navigation
- **Active:** nền surface nhẹ + viền, chữ/biểu tượng theo `primary`.
- **Hover:** nền muted nhẹ, tránh animation “nhảy” quá nhiều.

## 6. Do's and Don'ts

Do:
- Dùng `primary` để dẫn hành động, và dùng `muted/surface` để giữ nhịp đọc.
- Giữ copy ngắn, khuyến khích, tập trung vào bước tiếp theo.
- Ưu tiên ring/viền và nền lớp để phân cấp.

Don't:
- Không biến giao diện thành bảng điều khiển enterprise lạnh (xám dày, bảng nặng, copy khô).
- Không dùng blur/glass làm mặc định.
- Không dựa vào dropdown native cho những điểm cần đồng bộ thẩm mỹ (dùng Radix Select).
- Không lạm dụng in hoa hoặc font quá nặng như một “thủ thuật” tạo hierarchy.
- Không dùng “page-load choreography” ở các màn product; motion chỉ nên là phản hồi trạng thái.

