export const storage = {
  getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
  setItem: (key, value) => { window.localStorage.setItem(key, value); return Promise.resolve(); },
  removeItem: (key) => { window.localStorage.removeItem(key); return Promise.resolve(); },
};
// TODO: quando houver backend, migrar o refresh token para cookie httpOnly.
