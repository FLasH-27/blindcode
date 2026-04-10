const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export function checkAdminAuth() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("adminAuthed") === "true";
}

export function loginAdmin(password) {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem("adminAuthed", "true");
    return true;
  }
  return false;
}

export function logoutAdmin() {
  localStorage.removeItem("adminAuthed");
}
