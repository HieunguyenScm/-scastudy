import { assignments } from "../../lib/content";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import SiteNavigation from "../site-navigation";
import CaseWorkspace from "./case-workspace";

export const dynamic = "force-dynamic";

export default async function CaseStudyPage() {
  const user = await requireChatGPTUser("/case-study");
  return (
    <>
      <SiteNavigation
        current="case"
        user={{ displayName: user.displayName, email: user.email }}
        signOutPath={chatGPTSignOutPath("/case-study")}
      />
      <CaseWorkspace assignments={assignments} />
    </>
  );
}
