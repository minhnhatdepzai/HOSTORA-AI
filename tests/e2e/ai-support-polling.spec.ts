import { expect, test } from "@playwright/test";

test("an active guest conversation receives a later admin escalation and reply", async ({
  page,
}) => {
  const conversationId = "2f8af709-2f55-4aa0-bc02-d45ff4de5503";
  const accessToken = "guest-access-token-long-enough-for-the-test";
  let conversationPolls = 0;

  await page.route("**/api/account/session", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Bạn cần đăng nhập." }),
    }),
  );
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      headers: {
        "x-hostora-conversation-id": conversationId,
        "x-hostora-conversation-access": accessToken,
        "x-hostora-support-status": "active",
      },
      body: "Mình đang kiểm tra dữ liệu trước khi trả lời chắc chắn.",
    }),
  );
  await page.route(`**/api/ai/conversations/${conversationId}`, (route) => {
    conversationPolls += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conversation: {
          id: conversationId,
          status: "answered",
          messages: [
            {
              id: "message-user",
              role: "user",
              content: "Gói này có cam kết lưu lượng thực tế không?",
              sources: [],
            },
            {
              id: "message-admin",
              role: "admin",
              content: "Thông số này chưa được nhà cung cấp xác minh; mình sẽ gửi lại khi có nguồn chính thức.",
              sources: [],
            },
          ],
        },
      }),
    });
  });

  await page.goto("/ai-assistant");
  await page
    .getByLabel("Tin nhắn")
    .fill("Gói này có cam kết lưu lượng thực tế không?");
  await page.getByRole("button", { name: "Gửi", exact: true }).click();

  await expect(page.getByText("Quản trị viên HOSTORA")).toBeVisible();
  await expect(
    page.getByText(
      "Thông số này chưa được nhà cung cấp xác minh; mình sẽ gửi lại khi có nguồn chính thức.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Quản trị viên đã phản hồi",
  );
  expect(conversationPolls).toBeGreaterThan(0);
});
