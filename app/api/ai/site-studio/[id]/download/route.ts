import { zipSync, strToU8 } from "fflate";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStudioProject, renderStudioProject } from "@/lib/site-studio-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const project = await getStudioProject(id);
  if (!project)
    return Response.json(
      { error: "Không tìm thấy bản website này." },
      { status: 404 },
    );

  const html = renderStudioProject(project);
  const vendorRoot = path.join(process.cwd(), "public", "vendor");
  const [three, threeCore, gsap, scrollTrigger, threeLicense] =
    await Promise.all([
      readFile(path.join(vendorRoot, "three.module.js")),
      readFile(path.join(vendorRoot, "three.core.js")),
      readFile(path.join(vendorRoot, "gsap.min.js")),
      readFile(path.join(vendorRoot, "ScrollTrigger.min.js")),
      readFile(path.join(vendorRoot, "THREE-LICENSE.txt")),
    ]);
  const archive = zipSync({
    "index.html": strToU8(html),
    "vendor/three.module.js": new Uint8Array(three),
    "vendor/three.core.js": new Uint8Array(threeCore),
    "vendor/gsap.min.js": new Uint8Array(gsap),
    "vendor/ScrollTrigger.min.js": new Uint8Array(scrollTrigger),
    "vendor/THREE-LICENSE.txt": new Uint8Array(threeLicense),
    "README.md": strToU8(
      `# ${project.idea.brand}\n\nĐây là website tĩnh do HOSTORA Studio tạo. Giải nén toàn bộ thư mục rồi mở index.html qua một web server tĩnh để xem đầy đủ hiệu ứng 3D. Bạn có thể tải nguyên thư mục lên hosting.\n\nWebsite dùng Three.js và GSAP cục bộ trong thư mục vendor, không cần CDN. Nội dung mẫu cần được bạn kiểm tra và thay bằng thông tin chính thức trước khi xuất bản.`,
    ),
  });
  const filename =
    project.idea.brand
      .toLocaleLowerCase("vi")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "website";
  return new Response(new Uint8Array(archive), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}.zip"`,
      "cache-control": "private, no-store",
    },
  });
}
