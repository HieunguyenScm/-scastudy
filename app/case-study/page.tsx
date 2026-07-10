import Link from "next/link";
import { assignments } from "../../lib/content";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import CaseWorkspace from "./case-workspace";

export const dynamic = "force-dynamic";

export default async function CaseStudyPage() {
  const user = await requireChatGPTUser("/case-study");
  return <><header className="site-header lesson-header"><Link className="brand-lockup" href="/"><span className="brand-symbol">CT</span><span><strong>ctnascm</strong><small>Chàng trai năm ấy</small></span></Link><nav className="lesson-nav"><Link href="/">Dashboard</Link><Link href="/glossary">Glossary</Link><Link href="/case-study" className="active">Case workspace</Link></nav><div className="user-chip"><span>{user.displayName.slice(0,1).toUpperCase()}</span><div><strong>{user.displayName}</strong><a href={chatGPTSignOutPath("/case-study")}>Đăng xuất</a></div></div></header><CaseWorkspace assignments={assignments} /></>;
}
