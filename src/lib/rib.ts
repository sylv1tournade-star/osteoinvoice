/** Le praticien a renseigné un RIB (texte ou document) */
export function hasRib(profile: { rib?: string; ribImage?: string }): boolean {
  return Boolean(profile.rib?.trim() || profile.ribImage)
}
