const ADMIN_CREDENTIALS = process.env.NEXT_PUBLIC_ADMIN_CREDENTIALS;

export function checkAdminAuth() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("adminAuthed") === "true";
}

export function loginAdmin(username, password) {
  if (!ADMIN_CREDENTIALS) return false;
  
  const credentials = ADMIN_CREDENTIALS.split(',').map(c => c.trim());
  const isValid = credentials.some(c => {
    const [u, p] = c.split(':');
    return u === username && p === password;
  });

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
