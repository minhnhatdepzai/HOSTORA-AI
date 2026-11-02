# SEO va AI Visibility Audit Design

## Intent

Nang cap trang cong khai `/website-analyzer` thanh cong cu danh gia de chu doanh nghiep hieu ngay website dang can gi de duoc Google va cac tro ly AI doc, hieu, trich dan hoac de xuat. Bao cao phai huu ich cho demo giam khao nhung khong duoc hua thu hang hay bao dam ChatGPT/Claude se de xuat website.

## Goals

- Hien thi ba diem tach bach: SEO Google, kha nang AI doc/hieu, va diem tong quan.
- Kiem tra crawler AI pho bien, `robots.txt`, sitemap, `llms.txt`, du lieu cau truc va cac tin hieu SEO hien co.
- Dua ra viec can sua theo thu tu, tieu chi hoan thanh, bang chung va ban nhap khi an toan.
- Dung Ollama local chi de viet y tuong noi dung; diem va thu tu uu tien do code tat dinh quyet dinh.
- Hoat dong tot tren desktop va dien thoai, co loading/error/empty states va accessible names.

## Non-goals and anti-goals

- Khong goi OpenAI, Anthropic, Perplexity hay dich vu cham diem cloud.
- Khong khang dinh thu hang, traffic, doanh thu, citation thuc te hoac chac chan duoc AI de xuat.
- Khong tu dong sua website ben thu ba va khong mo rong quyen SSRF/network hien co.
- Khong nhap nguyen mot du an GitHub hoac them dependency runtime khi code hien co da du kha nang.

## Approach

Da xem xet ba huong: giu UI 7 check cu, nhap nguyen cong cu GEO ben ngoai, hoac nang UI hien co tren API HOSTORA va bo sung bo cham AI tat dinh. Chon huong thu ba vi giu local-first, tai su dung `/api/seo/audit`, khong tao hai he thong diem va co the kiem thu ro rang. Repo MIT `optifeed/optifeed-radar` duoc giu ngoai runtime lam tai lieu tham khao cho danh sach crawler va cach cong khai trong so.

## Product and visual direction

Bao cao mang cam giac “phieu kham website”: mot form ngan, ba diem noi bat nhung khong phu truong, thanh so sanh co nhan truc tiep, danh sach viec can lam doc truoc, chi tiet ky thuat mo rong sau. Dung he thong mau, typography, panel, button va Lucide hien co; khong tao dashboard card-grid chung chung, khong dung mau sac lam tin hieu duy nhat, ton trong reduced motion.

## Scoring and AI boundary

- `seo`: tinh tu cac finding khong thuoc nhom `geo`, giu trong so high=3, medium=2, low=1.
- `aiVisibility`: crawler access 40, structured entities 25, `llms.txt` 15, meta basics 15, sitemap 5.
- `overall`: trung binh lam tron cua hai diem tren; top-level `score` giu dong bo voi `overall` de client cu khong vo.
- Bot kiem tra: GPTBot, OAI-SearchBot, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, GoogleOther, CCBot va meta-externalagent.
- Ollama khong duoc sua diem, finding, bang crawler hay thu tu automation plan.

## Constraints

- Next.js 16 App Router, TypeScript strict, Server Components mac dinh.
- URL ngoai phai tiep tuc qua `validatePublicUrl`, gioi han dung luong va timeout hien co.
- Khong log PII, khong them cloud fallback, khong lo stack trace.
- Kiem tra desktop/mobile va reduced motion truoc khi bao hoan thanh.

