import { getApiUrl } from "./query-client";

/**
 * Resuelve la URL de una imagen de perfil.
 * Si la imagen es un data URI base64, la devuelve directamente.
 * Si es una URL relativa, la concatena con la URL del backend.
 * Si es una URL absoluta, la devuelve tal cual (con ajuste de localhost si es necesario).
 */
export function resolveProfileImageUrl(profileImage: string | null | undefined): string {
  if (!profileImage) {
    return "";
  }

  // Si ya es un data URI base64, devolverlo directamente
  if (profileImage.startsWith('data:image')) {
    return profileImage;
  }

  const apiBase = getApiUrl().replace(/\/+$/, "");

  // Si es una URL absoluta
  if (/^https?:\/\//i.test(profileImage)) {
    try {
      const source = new URL(profileImage);
      // Si es localhost, reemplazar con la URL del backend
      if (source.hostname === "localhost" || source.hostname === "127.0.0.1") {
        const target = new URL(apiBase);
        source.protocol = target.protocol;
        source.host = target.host;
        return source.toString();
      }
    } catch {
      return profileImage;
    }

    return profileImage;
  }

  // Si es una ruta relativa, concatenar con la URL del backend
  return `${apiBase}${profileImage.startsWith("/") ? "" : "/"}${profileImage}`;
}
