/** Opciones de un <select> de clubes: si hay clubes de Primera B, se agrupan bajo "Primera" y "Primera B". */
export interface ClubOption {
  id: string;
  name: string;
  division?: "primera" | "b";
}

export function ClubOptions({ clubs }: { clubs: ClubOption[] }) {
  const b = clubs.filter((c) => c.division === "b");
  if (b.length === 0) {
    return (
      <>
        {clubs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </>
    );
  }
  const first = clubs.filter((c) => c.division !== "b");
  return (
    <>
      <optgroup label="Primera División">
        {first.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Primera B">
        {b.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </optgroup>
    </>
  );
}
