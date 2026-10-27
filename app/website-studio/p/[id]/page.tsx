import { notFound } from "next/navigation";
import { getStudioProject } from "@/lib/site-studio-store";
import { StudioSharedProject } from "@/components/studio-shared-project";

export const dynamic = "force-dynamic";

export default async function SharedStudioProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getStudioProject(id);
  if (!project) notFound();
  return (
    <div className="studio-shared-page">
      <div className="commerce-shell">
        <p className="commerce-kicker dark">HOSTORA · XƯỞNG TẠO WEBSITE</p>
        <h1>{project.idea.brand}</h1>
        <p className="studio-shared-intro">
          Bản demo đã lưu. Bạn có thể yêu cầu chỉnh nội dung hoặc tải toàn bộ mã
          website.
        </p>
        <StudioSharedProject
          project={{
            id: project.id,
            idea: project.idea,
            brief: project.brief,
            downloadUrl: `/api/ai/site-studio/${project.id}/download`,
            sharePath: `/website-studio/p/${project.id}`,
            repositoryUrl: project.repositoryUrl,
            publishMessage: project.publishMessage,
            writingTone: project.writingTone,
          }}
        />
      </div>
    </div>
  );
}
