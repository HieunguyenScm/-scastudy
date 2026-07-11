import Link from "next/link";
import { chatGPTSignOutPath } from "../chatgpt-auth";

export default function AccessDeniedPage() {
  return (
    <main className="access-denied-shell" id="main-content">
      <section>
        <p className="kicker">PRIVATE LEARNING OS</p>
        <h1>Tài khoản này chưa được cấp quyền.</h1>
        <p>
          ctnascm là workspace học riêng. Hãy đăng nhập bằng tài khoản chủ sở hữu
          hoặc quay lại sau khi quản trị viên thêm email của bạn.
        </p>
        <div className="hero-buttons">
          <a className="primary-action" href={chatGPTSignOutPath("/")}>Đổi tài khoản</a>
          <Link className="secondary-action" href="/">Thử lại</Link>
        </div>
      </section>
    </main>
  );
}
