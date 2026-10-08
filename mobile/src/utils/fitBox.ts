/**
 * Plus grande boîte aux proportions de la photo (aspect = hauteur / largeur)
 * tenant dans maxWidth x maxHeight. La heatmap couvre l'image entière (le
 * modèle l'étire à sa taille d'entrée) : afficher la photo entière, sans
 * recadrage, garde les deux alignées.
 */
export function fitBox(maxWidth: number, maxHeight: number, aspect: number) {
  const width = Math.min(maxWidth, maxHeight / aspect);
  return { width, height: width * aspect };
}
