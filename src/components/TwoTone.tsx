/** Headlines are written "First part|second part". The design uses one navy colour, so the marker is just removed. */
export function twoTone(text: string) {
  return text.replace('|', '');
}
