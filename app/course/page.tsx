import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import SiteNavigation from "../site-navigation";
import CourseClient from "./course-client";

export const dynamic = "force-dynamic";

export default async function CoursePage() {
  const user = await requireChatGPTUser("/course");
  return (
    <>
      <SiteNavigation
        current="lesson"
        user={{ displayName: user.displayName, email: user.email }}
        signOutPath={chatGPTSignOutPath("/course")}
      />
      <CourseClient learnerName={user.displayName} />
    </>
  );
}
