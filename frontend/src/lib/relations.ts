/**
 * Valid "claimed identity" values -- who the caller says they are, shown as
 * the transfer recipient. Mirrors backend/app/enums.py `ClaimedIdentity`;
 * the backend rejects anything not in this list.
 */
export const RELATIONS = [
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "husband", label: "Husband" },
  { value: "wife", label: "Wife" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "grandson", label: "Grandson" },
  { value: "granddaughter", label: "Granddaughter" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandmother", label: "Grandmother" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt", label: "Aunt" },
  { value: "cousin", label: "Cousin" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "other", label: "Other" },
] as const;

export function relationLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return RELATIONS.find((r) => r.value === value)?.label ?? value;
}
