import Link from "next/link";
import { glossary } from "../../lib/content";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import GlossaryClient from "./glossary-client";

export const dynamic = "force-dynamic";

export default async function GlossaryPage() {
  const user = await requireChatGPTUser("/glossary");
  return <><header className="site-header lesson-header"><Link className="brand-lockup" href="/"><span className="brand-symbol">CT</span><span><strong>ctnascm</strong><small>Chàng trai năm ấy</small></span></Link><nav className="lesson-nav"><Link href="/">Dashboard</Link><Link href="/glossary" className="active">Glossary</Link><Link href="/case-study">Case workspace</Link></nav><div className="user-chip"><span>{user.displayName.slice(0,1).toUpperCase()}</span><div><strong>{user.displayName}</strong><a href={chatGPTSignOutPath("/glossary")}>Đăng xuất</a></div></div></header><GlossaryClient items={glossary} /></>;
}
