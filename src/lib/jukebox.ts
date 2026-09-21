export interface MenuItem {
  image: string;
  link: string;
  title: string;
  description: string;
}

/** A jukebox-style selection code, e.g. "A1", "A2" ... "B1". */
export function getSelectionCode(index: number): string {
  const letter = String.fromCharCode(65 + Math.floor(index / 9));
  const number = (index % 9) + 1;
  return `${letter}${number}`;
}
