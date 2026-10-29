export function normalizeContact(input: { name: string; phone: string }) {
  const name = input.name.trim().replace(/\s+/g, " ");
  const rawPhone = input.phone.trim();
  const phone = rawPhone.replace(/[\s().-]/g, "");
  const error = name.length < 2 || name.length > 100
    ? "Vui lòng nhập họ tên từ 2 đến 100 ký tự, không chỉ khoảng trắng."
    : !/^[+\d\s().-]+$/.test(rawPhone) || !/^\+?[1-9]\d{8,14}$|^0\d{8,10}$/.test(phone)
      ? "Vui lòng nhập số điện thoại hợp lệ gồm 9–15 chữ số; dấu + chỉ ở đầu."
      : null;
  return { name, phone, error };
}
