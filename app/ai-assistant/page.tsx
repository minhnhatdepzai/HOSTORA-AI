import type { Metadata } from "next";
import { AiAssistant } from "@/components/ai-assistant";
import { PageHeading } from "@/components/page-heading";
export const metadata: Metadata = { title: "Trợ lý AI local" };
export default function AiAssistantPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="Local RAG assistant"
        title="Hỏi sâu. Thấy rõ nguồn."
        description="Chat streaming từ Qwen trên GPU local; catalog và kiến thức được truy xuất trước khi model trả lời."
      />
      <AiAssistant />
    </div>
  );
}
