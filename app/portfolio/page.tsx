import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import SiteNavigation from "../site-navigation";
import PortfolioClient from "./portfolio-client";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await requireChatGPTUser("/portfolio");
  return <><SiteNavigation current="portfolio" user={{ displayName: user.displayName, email: user.email }} signOutPath={chatGPTSignOutPath("/portfolio")} /><PortfolioClient /></>;
}
