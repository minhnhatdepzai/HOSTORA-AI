import { randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = process.env.HOSTORA_PAYMENTS_DB_PATH
  ? path.resolve(process.env.HOSTORA_PAYMENTS_DB_PATH)
  : path.join(process.cwd(), "data", "runtime", "payments.sqlite");

const database = new DatabaseSync(databasePath);
database.exec(
  "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;",
);

const requiredTables = [
  "customer_accounts",
  "customer_chat_messages",
  "ai_conversations",
  "ai_conversation_messages",
];
const tableExists = database.prepare(
  "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?",
);
for (const table of requiredTables) {
  if (!tableExists.get(table)) {
    database.close();
    throw new Error(
      `Thiếu bảng ${table}. Hãy chạy HOSTORA một lần để khởi tạo cơ sở dữ liệu rồi thử lại.`,
    );
  }
}

const minutesAgo = (minutes) =>
  new Date(Date.now() - minutes * 60_000).toISOString();
const passwordHash = () => {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(randomBytes(32), salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
};

const demonstrations = [
  {
    customer: {
      id: "demo-customer-mai-nail",
      name: "Trần Ngọc Mai",
      email: "mai.nail@demo.hostora.invalid",
      createdAt: minutesAgo(195),
    },
    conversation: {
      id: "demo-conversation-mai-nail",
      status: "active",
      escalationReason: null,
      createdAt: minutesAgo(38),
      updatedAt: minutesAgo(31),
      messages: [
        [
          "user",
          "Mình có tiệm nail ở Đà Nẵng, cần website giới thiệu dịch vụ và nhận lịch hẹn. Khoảng 3.000 lượt xem mỗi tháng thì nên bắt đầu với gói nào?",
          38,
        ],
        [
          "assistant",
          "Với nhu cầu giới thiệu dịch vụ, thư viện ảnh và khoảng 3.000 lượt xem mỗi tháng, bạn có thể bắt đầu từ gói Cloud Startup. Trước khi chốt, mình cần biết website có thanh toán trực tuyến hay chỉ nhận thông tin đặt lịch.",
          35,
        ],
        [
          "user",
          "Trước mắt chỉ nhận lịch và gửi xác nhận qua email, chưa cần thanh toán.",
          31,
        ],
      ],
    },
  },
  {
    customer: {
      id: "demo-customer-huy-coffee",
      name: "Lê Quốc Huy",
      email: "huy.coffee@demo.hostora.invalid",
      createdAt: minutesAgo(360),
    },
    conversation: {
      id: "demo-conversation-huy-coffee",
      status: "escalated",
      escalationReason: "human_requested",
      createdAt: minutesAgo(27),
      updatedAt: minutesAgo(18),
      messages: [
        [
          "user",
          "Website WordPress của quán đang ở nhà cung cấp khác. HOSTORA có chuyển dữ liệu sang mà hạn chế gián đoạn không?",
          27,
        ],
        [
          "assistant",
          "Có thể lập kế hoạch sao lưu, chuyển bản sao, kiểm tra trước rồi mới đổi DNS để giảm thời gian gián đoạn. Thời gian cụ thể còn phụ thuộc dung lượng và quyền truy cập máy chủ hiện tại.",
          24,
        ],
        [
          "user",
          "Cho mình gặp người phụ trách để kiểm tra website và báo thời gian cụ thể nhé.",
          20,
        ],
        [
          "assistant",
          "Mình đã chuyển toàn bộ nội dung trao đổi cho quản trị viên. Anh/chị phụ trách sẽ kiểm tra phạm vi và phản hồi ngay trong cuộc trò chuyện này.",
          18,
        ],
      ],
    },
  },
  {
    customer: {
      id: "demo-customer-ha-english",
      name: "Phạm Thu Hà",
      email: "ha.english@demo.hostora.invalid",
      createdAt: minutesAgo(520),
    },
    conversation: {
      id: "demo-conversation-ha-english",
      status: "answered",
      escalationReason: "insufficient_data",
      createdAt: minutesAgo(74),
      updatedAt: minutesAgo(12),
      messages: [
        [
          "user",
          "Trung tâm mình cần 12 email theo tên miền và muốn biết dữ liệu được sao lưu bao lâu. Gói doanh nghiệp có đáp ứng được không?",
          74,
        ],
        [
          "assistant",
          "Mình chưa có đủ dữ liệu đã xác minh về số hộp thư và thời gian lưu bản sao của từng gói, nên đã chuyển câu hỏi cho quản trị viên thay vì tự suy đoán.",
          70,
        ],
        [
          "admin",
          "Chào chị Hà, bên em đã ghi nhận nhu cầu 12 hộp thư. Đội kỹ thuật sẽ xác nhận chính sách sao lưu theo gói và gửi bảng cấu hình trước khi chị quyết định; hiện chưa phát sinh đơn hàng hay thanh toán.",
          12,
        ],
      ],
    },
  },
  {
    customer: {
      id: "demo-customer-nam-interior",
      name: "Nguyễn Đức Nam",
      email: "nam.interior@demo.hostora.invalid",
      createdAt: minutesAgo(730),
    },
    conversation: {
      id: "demo-conversation-nam-interior",
      status: "escalated",
      escalationReason: "out_of_scope",
      createdAt: minutesAgo(11),
      updatedAt: minutesAgo(7),
      messages: [
        [
          "user",
          "Nếu làm website cho studio nội thất thì HOSTORA có cam kết lên top 1 Google trong 30 ngày không?",
          11,
        ],
        [
          "assistant",
          "HOSTORA không thể cam kết vị trí top 1 hoặc thời hạn cố định vì kết quả còn phụ thuộc cạnh tranh, nội dung, kỹ thuật và nhiều tín hiệu bên ngoài. Mình đã chuyển câu hỏi cho quản trị viên để tư vấn phạm vi SEO có thể đo lường thực tế.",
          7,
        ],
      ],
    },
  },
];

const insertCustomer = database.prepare(`
  INSERT OR IGNORE INTO customer_accounts
  (id, email, name, password_hash, failed_logins, locked_until, created_at, updated_at)
  VALUES (?, ?, ?, ?, 0, NULL, ?, ?)
`);
const insertConversation = database.prepare(`
  INSERT OR IGNORE INTO ai_conversations
  (id, customer_id, access_token_hash, status, escalation_reason, created_at, updated_at)
  VALUES (?, ?, NULL, ?, ?, ?, ?)
`);
const insertConversationMessage = database.prepare(`
  INSERT OR IGNORE INTO ai_conversation_messages
  (id, conversation_id, role, content, sources_json, created_at)
  VALUES (?, ?, ?, ?, '[]', ?)
`);
const insertCustomerMessage = database.prepare(`
  INSERT OR IGNORE INTO customer_chat_messages
  (id, customer_id, conversation_id, role, content, sources_json, created_at)
  VALUES (?, ?, ?, ?, ?, '[]', ?)
`);

let insertedCustomers = 0;
let insertedConversations = 0;
let insertedMessages = 0;

database.exec("BEGIN IMMEDIATE");
try {
  for (const entry of demonstrations) {
    const customer = entry.customer;
    const conversation = entry.conversation;
    insertedCustomers += Number(
      insertCustomer.run(
        customer.id,
        customer.email,
        customer.name,
        passwordHash(),
        customer.createdAt,
        customer.createdAt,
      ).changes,
    );
    insertedConversations += Number(
      insertConversation.run(
        conversation.id,
        customer.id,
        conversation.status,
        conversation.escalationReason,
        conversation.createdAt,
        conversation.updatedAt,
      ).changes,
    );

    conversation.messages.forEach(([role, content, ageMinutes], index) => {
      const messageId = `${conversation.id}-message-${index + 1}`;
      const createdAt = minutesAgo(ageMinutes);
      insertedMessages += Number(
        insertConversationMessage.run(
          messageId,
          conversation.id,
          role,
          content,
          createdAt,
        ).changes,
      );
      insertCustomerMessage.run(
        messageId,
        customer.id,
        conversation.id,
        role === "user" ? "user" : "assistant",
        content,
        createdAt,
      );
    });
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
} finally {
  database.close();
}

console.log(
  `Đã thêm ${insertedCustomers} khách hàng demo, ${insertedConversations} hội thoại và ${insertedMessages} tin nhắn vào ${databasePath}.`,
);
if (!insertedCustomers && !insertedConversations && !insertedMessages) {
  console.log("Dữ liệu demo đã tồn tại; không tạo bản ghi trùng.");
}
