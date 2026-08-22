const ACCESS_TOKEN_KEY =
  "taslim_ai_access_token";

const GUEST_ID_KEY =
  "taslim_ai_guest_id";

const isBrowser = () =>
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined";

// =========================================================
// SAVE
// =========================================================

export const saveAccessToken =
  (token) => {
    if (!token) {
      throw new Error(
        "Access token is required"
      );
    }

    if (!isBrowser()) {
      return;
    }

    localStorage.setItem(
      ACCESS_TOKEN_KEY,
      token
    );
  };


// =========================================================
// GET
// =========================================================

export const getAccessToken =
  () => {
    if (!isBrowser()) {
      return null;
    }

    return localStorage.getItem(
      ACCESS_TOKEN_KEY
    );
  };


// =========================================================
// REMOVE
// =========================================================

export const removeAccessToken =
  () => {
    if (!isBrowser()) {
      return;
    }

    localStorage.removeItem(
      ACCESS_TOKEN_KEY
    );
  };


// =========================================================
// CHECK
// =========================================================

export const hasAccessToken =
  () => {
    return Boolean(
      getAccessToken()
    );
  };

export const getGuestId = () => {
  if (!isBrowser()) return null;

  let guestId = localStorage.getItem(GUEST_ID_KEY);

  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }

  return guestId;
};
  
