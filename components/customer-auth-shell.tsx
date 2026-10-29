import Image from "next/image";
import Link from "next/link";

export function CustomerAuthShell({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <div className="customer-auth-page">
      <section className="customer-auth-story" aria-labelledby="customer-auth-title">
        <Link href="/" className="customer-auth-brand" aria-label="Về trang chủ HOSTORA">
          <Image src="/hostora-icon.png" alt="" width={48} height={48} />
          <span><strong>HOSTORA</strong><small>SỔ DỊCH VỤ CỦA BẠN</small></span>
        </Link>
        <div className="customer-auth-story-copy">
          <p className="customer-auth-kicker">{eyebrow}</p>
          <h1 id="customer-auth-title">{title}</h1>
          <p>{copy}</p>
        </div>
        <ol className="customer-auth-benefits" aria-label="Quyền lợi tài khoản">
          <li><span>01</span><p><strong>Voucher tự cất</strong>Mã ưu đãi từ đơn đã mua nằm sẵn trong tài khoản.</p></li>
          <li><span>02</span><p><strong>Yêu cầu có người theo dõi</strong>Mỗi vấn đề có mã hỗ trợ và trạng thái riêng.</p></li>
          <li><span>03</span><p><strong>Website AI thuộc về bạn</strong>Chỉ tài khoản sở hữu mới được sửa và tải mã nguồn.</p></li>
        </ol>
      </section>
      <section className="customer-auth-panel">{children}</section>
    </div>
  );
}
