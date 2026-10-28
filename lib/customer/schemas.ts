import { z } from "zod";

export const customerPasswordSchema = z
  .string()
  .min(10, "Mật khẩu cần ít nhất 10 ký tự.")
  .max(128, "Mật khẩu quá dài.")
  .regex(/[A-Za-zÀ-ỹ]/u, "Mật khẩu cần có chữ.")
  .regex(/[0-9]/, "Mật khẩu cần có số.");

export const customerRegisterSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(160),
    password: customerPasswordSchema,
  })
  .strict();

export const customerLoginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(160),
    password: z.string().min(1).max(128),
  })
  .strict();

export const customerForgotSchema = z
  .object({ email: z.string().trim().toLowerCase().email().max(160) })
  .strict();

export const customerResetSchema = z
  .object({
    token: z.string().min(32).max(256),
    password: customerPasswordSchema,
  })
  .strict();

export const customerSupportSchema = z
  .object({
    subject: z.string().trim().min(5).max(140),
    category: z.enum([
      "order",
      "payment",
      "refund",
      "website",
      "account",
      "other",
    ]),
    message: z.string().trim().min(20).max(2000),
  })
  .strict();
