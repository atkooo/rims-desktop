export const required = (v, msg = "Wajib diisi") => !!v || msg;
export const minLength = (v, n) =>
  (v && v.length >= n) || `Minimal ${n} karakter`;
