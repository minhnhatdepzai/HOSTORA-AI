import { describe, expect, it } from "vitest";
import { leadsToCsv, readStoredLeads } from "@/lib/local-admin";

describe("local admin data", () => {
  it("rejects malformed browser data", () => {
    expect(readStoredLeads("not-json")).toEqual([]);
    expect(
      readStoredLeads(JSON.stringify([{ name: "Thiếu dữ liệu" }])),
    ).toEqual([]);
  });

  it("accepts a valid lead and normalizes an unknown status", () => {
    const leads = readStoredLeads(
      JSON.stringify([
        {
          id: "lead-1",
          name: "Nguyễn Lan",
          phone: "0900000000",
          plan: "Hostinger Premium",
          createdAt: "2026-10-24T08:00:00.000Z",
          status: "unexpected",
        },
      ]),
    );
    expect(leads).toHaveLength(1);
    expect(leads[0]?.status).toBe("new");
  });

  it("prevents spreadsheet formulas in CSV exports", () => {
    const [lead] = readStoredLeads(
      JSON.stringify([
        {
          id: "lead-2",
          name: '  =HYPERLINK("https://bad.example")',
          phone: "+84900000000",
          plan: "Gói mẫu",
          createdAt: "2026-10-24T08:00:00.000Z",
          status: "new",
        },
      ]),
    );
    expect(leadsToCsv([lead!])).toContain("'  =HYPERLINK");
    expect(leadsToCsv([lead!])).toContain("'+84900000000");
  });
});
