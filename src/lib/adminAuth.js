const VALID_ADMINS = [
  { username: "admin1", password: "blindcode2026" },
  { username: "admin2", password: "secret123" },
  { username: "admin3", password: "anotherPassword" }
];

export function checkAdminAuth() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("adminAuthed") === "true";
}

export function loginAdmin(username, password) {
  const isValid = VALID_ADMINS.some(
    (admin) => admin.username === username && admin.password === password
  );

  if (isValid) {
    localStorage.setItem("adminAuthed", "true");
    localStorage.setItem("adminUsername", username);
    return true;
  }
  return false;
}

export function logoutAdmin() {
  localStorage.removeItem("adminAuthed");
  localStorage.removeItem("adminUsername");
}

export function getAdminUsername() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminUsername");
}
