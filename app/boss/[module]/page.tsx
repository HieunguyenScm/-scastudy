import { notFound } from "next/navigation";
import { getBossChallenge } from "../../../content/boss-challenges";
import { chatGPTSignOutPath, requireChatGPTUser } from "../../chatgpt-auth";
import SiteNavigation from "../../site-navigation";
import BossWorkspace from "./boss-workspace";

export const dynamic = "force-dynamic";

export default async function BossPage({ params }: { params: Promise<{ module: string }> }) {
  const moduleNumber = Number((await params).module);
  const challenge = getBossChallenge(moduleNumber);
  if (!challenge) notFound();
  const user = await requireChatGPTUser(`/boss/${moduleNumber}`);
  return <><SiteNavigation current="lesson" user={{ displayName: user.displayName, email: user.email }} signOutPath={chatGPTSignOutPath(`/boss/${moduleNumber}`)} /><BossWorkspace challenge={challenge} /></>;
}
