import { glossary } from "../../lib/content";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import SiteNavigation from "../site-navigation";
import GlossaryClient from "./glossary-client";

export const dynamic = "force-dynamic";

export default async function GlossaryPage() {
  const user = await requireChatGPTUser("/glossary");
  return (
    <>
      <SiteNavigation
        current="glossary"
        user={{ displayName: user.displayName, email: user.email }}
        signOutPath={chatGPTSignOutPath("/glossary")}
      />
      <GlossaryClient items={glossary} />
    </>
  );
}
