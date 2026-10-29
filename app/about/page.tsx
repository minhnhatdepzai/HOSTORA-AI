import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Câu chuyện HOSTORA",
  description:
    "HOSTORA giúp người kinh doanh bắt đầu website bằng lời giải thích rõ ràng, bản thử có thể xem và chi phí có thể kiểm tra.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="journal-wrap">
          <p className="journal-eyebrow">CÂU CHUYỆN HOSTORA</p>
          <h1>Ai cũng nên hiểu thứ mình sắp mua cho website.</h1>
          <p>
            Một website không bắt đầu ở bảng thông số. Nó bắt đầu khi người kinh
            doanh biết mình muốn khách nhìn thấy gì, cần trả bao nhiêu và sẽ làm
            gì sau khi ra mắt.
          </p>
        </div>
      </section>
      <section className="about-values journal-wrap">
        <div>
          <span>01 / RÕ Ý</span>
          <h2>Thử ý tưởng trước.</h2>
          <p>
            Bạn kể về việc kinh doanh, chọn phong cách và xem bản thử. Mỗi lựa
            chọn vẫn thuộc về bạn.
          </p>
          <Link href="/website-studio">
            Tạo bản xem trước <ArrowRight size={17} />
          </Link>
        </div>
        <div>
          <span>02 / RÕ TIỀN</span>
          <h2>Đọc đủ cả kỳ sau.</h2>
          <p>
            So sánh kỳ thanh toán và giá gia hạn khi có dữ liệu. Thông tin chưa
            xác minh được ghi rõ để bạn hỏi lại trước khi mua.
          </p>
          <Link href="/services">
            Xem dịch vụ <ArrowRight size={17} />
          </Link>
        </div>
        <div>
          <span>03 / RÕ ĐƯỜNG</span>
          <h2>Ra mắt rồi vẫn có bước tiếp.</h2>
          <p>
            Sổ tay đi cùng bạn từ trang đầu tiên tới lúc bổ sung nội dung, đo
            câu hỏi của khách và cân nhắc thêm AI.
          </p>
          <Link href="/journal">
            Mở sổ tay <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <div className="about-note journal-wrap">
        HOSTORA đang phát triển. Mỗi tính năng thanh toán hoặc triển khai chỉ
        được xem là hoàn tất khi có xác nhận rõ trong đơn hàng và trên trang của
        bạn.
      </div>
    </div>
  );
}
