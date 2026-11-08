const toneRows = {
  a: ["a", "á", "à", "ả", "ã", "ạ"],
  "ă": ["ă", "ắ", "ằ", "ẳ", "ẵ", "ặ"],
  "â": ["â", "ấ", "ầ", "ẩ", "ẫ", "ậ"],
  e: ["e", "é", "è", "ẻ", "ẽ", "ẹ"],
  "ê": ["ê", "ế", "ề", "ể", "ễ", "ệ"],
  i: ["i", "í", "ì", "ỉ", "ĩ", "ị"],
  o: ["o", "ó", "ò", "ỏ", "õ", "ọ"],
  "ô": ["ô", "ố", "ồ", "ổ", "ỗ", "ộ"],
  "ơ": ["ơ", "ớ", "ờ", "ở", "ỡ", "ợ"],
  u: ["u", "ú", "ù", "ủ", "ũ", "ụ"],
  "ư": ["ư", "ứ", "ừ", "ử", "ữ", "ự"],
  y: ["y", "ý", "ỳ", "ỷ", "ỹ", "ỵ"],
} as const;

type VowelFamily = keyof typeof toneRows;
type Tone = 0 | 1 | 2 | 3 | 4 | 5;

const toneByDigit = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
} as const;

type VowelInfo = {
  family: VowelFamily;
  tone: Tone;
  uppercase: boolean;
};

function vowelInfo(character: string): VowelInfo | null {
  const lower = character.toLocaleLowerCase("vi");
  for (const [family, row] of Object.entries(toneRows) as Array<
    [VowelFamily, readonly string[]]
  >) {
    const tone = row.indexOf(lower);
    if (tone >= 0) {
      return {
        family,
        tone: tone as Tone,
        uppercase: character !== lower,
      };
    }
  }
  return null;
}

function renderVowel(info: VowelInfo) {
  const value = toneRows[info.family][info.tone];
  return info.uppercase ? value.toLocaleUpperCase("vi") : value;
}

function replaceAt(value: string, index: number, replacement: string) {
  return `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`;
}

function withFamily(value: string, index: number, family: VowelFamily) {
  const info = vowelInfo(value[index] ?? "");
  return info
    ? replaceAt(value, index, renderVowel({ ...info, family }))
    : value;
}

function applySingleModifier(
  word: string,
  digit: string,
  pairs: ReadonlyArray<readonly [VowelFamily, VowelFamily]>,
) {
  for (let index = word.length - 1; index >= 0; index -= 1) {
    const info = vowelInfo(word[index] ?? "");
    if (!info) continue;
    const pair = pairs.find(
      ([plain, modified]) =>
        info.family === plain || info.family === modified,
    );
    if (!pair) continue;
    const [plain, modified] = pair;
    if (info.family === modified) {
      return {
        word: withFamily(word, index, plain),
        keepDigit: true,
      };
    }
    return {
      word: withFamily(word, index, modified),
      keepDigit: false,
    };
  }
  return { word, keepDigit: true };
}

function applyHorn(word: string) {
  for (let index = word.length - 2; index >= 0; index -= 1) {
    const first = vowelInfo(word[index] ?? "");
    const second = vowelInfo(word[index + 1] ?? "");
    if (
      first &&
      second &&
      ["u", "ư"].includes(first.family) &&
      ["o", "ơ"].includes(second.family)
    ) {
      const alreadyModified = first.family === "ư" && second.family === "ơ";
      const firstFamily: VowelFamily = alreadyModified ? "u" : "ư";
      const secondFamily: VowelFamily = alreadyModified ? "o" : "ơ";
      const changedFirst = withFamily(word, index, firstFamily);
      return {
        word: withFamily(changedFirst, index + 1, secondFamily),
        keepDigit: alreadyModified,
      };
    }
  }
  return applySingleModifier(word, "7", [
    ["o", "ơ"],
    ["u", "ư"],
  ]);
}

function applyDStroke(word: string) {
  for (let index = word.length - 1; index >= 0; index -= 1) {
    const character = word[index] ?? "";
    if (character === "d" || character === "D") {
      return {
        word: replaceAt(word, index, character === "D" ? "Đ" : "đ"),
        keepDigit: false,
      };
    }
    if (character === "đ" || character === "Đ") {
      return {
        word: replaceAt(word, index, character === "Đ" ? "D" : "d"),
        keepDigit: true,
      };
    }
  }
  return { word, keepDigit: true };
}

function toneTarget(word: string) {
  const candidates = [...word]
    .map((character, index) => ({ index, info: vowelInfo(character) }))
    .filter(
      (item): item is { index: number; info: VowelInfo } => Boolean(item.info),
    );
  if (!candidates.length) return null;

  const spoken = candidates.filter(({ index, info }) => {
    const previous = word[index - 1]?.toLocaleLowerCase("vi");
    const hasAnotherVowel = candidates.some((item) => item.index > index);
    if (info.family === "u" && previous === "q" && hasAnotherVowel)
      return false;
    if (info.family === "i" && previous === "g" && hasAnotherVowel)
      return false;
    return true;
  });
  const usable = spoken.length ? spoken : candidates;
  const modified = usable.filter(({ info }) =>
    ["ă", "â", "ê", "ô", "ơ", "ư"].includes(info.family),
  );
  return modified.at(-1) ?? usable[0] ?? null;
}

function applyTone(word: string, tone: Tone) {
  const target = toneTarget(word);
  if (!target) return { word, keepDigit: true };
  if (target.info.tone === tone) {
    return {
      word: replaceAt(
        word,
        target.index,
        renderVowel({ ...target.info, tone: 0 }),
      ),
      keepDigit: true,
    };
  }
  return {
    word: replaceAt(
      word,
      target.index,
      renderVowel({ ...target.info, tone }),
    ),
    keepDigit: false,
  };
}

function transformWord(word: string, digit: string) {
  if (digit in toneByDigit)
    return applyTone(word, toneByDigit[digit as keyof typeof toneByDigit]);
  if (digit === "6")
    return applySingleModifier(word, digit, [
      ["a", "â"],
      ["e", "ê"],
      ["o", "ô"],
    ]);
  if (digit === "7") return applyHorn(word);
  if (digit === "8")
    return applySingleModifier(word, digit, [["a", "ă"]]);
  if (digit === "9") return applyDStroke(word);
  return { word, keepDigit: true };
}

function insertedCharacter(previous: string, next: string) {
  if (next.length !== previous.length + 1) return null;
  let index = 0;
  while (index < previous.length && previous[index] === next[index]) index += 1;
  if (previous.slice(index) !== next.slice(index + 1)) return null;
  return { character: next[index] ?? "", index };
}

export function applyVniInputEdit(previous: string, next: string) {
  const insertion = insertedCharacter(previous, next);
  if (!insertion || !/^[1-9]$/.test(insertion.character)) return next;

  const withoutDigit = `${next.slice(0, insertion.index)}${next.slice(insertion.index + 1)}`;
  let start = insertion.index;
  while (start > 0 && /[\p{L}]/u.test(withoutDigit[start - 1] ?? ""))
    start -= 1;
  let end = insertion.index;
  while (end < withoutDigit.length && /[\p{L}]/u.test(withoutDigit[end] ?? ""))
    end += 1;
  const originalWord = withoutDigit.slice(start, end);
  const transformed = transformWord(originalWord, insertion.character);
  if (transformed.word === originalWord && transformed.keepDigit) return next;

  const base = `${withoutDigit.slice(0, start)}${transformed.word}${withoutDigit.slice(end)}`;
  if (!transformed.keepDigit) return base;
  const cursor = start + (insertion.index - start);
  return `${base.slice(0, cursor)}${insertion.character}${base.slice(cursor)}`;
}

export function typeWithVni(value: string) {
  return [...value].reduce(
    (current, character) =>
      applyVniInputEdit(current, `${current}${character}`),
    "",
  );
}
