/**
 * Minimal YAML subset loader for suite files (mappings, sequences, scalars).
 * Not a full YAML 1.2 engine — enough for our CaseDefinition packs.
 */
export function loadYaml(text) {
  const lines = String(text)
    .replace(/\t/g, "  ")
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l) && l.trim() !== "");
  let i = 0;

  function indentOf(line) {
    return line.match(/^ */)[0].length;
  }

  function parseBlock(minIndent) {
    if (i >= lines.length) return null;
    const line = lines[i];
    const ind = indentOf(line);
    if (ind < minIndent) return null;
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const arr = [];
      while (i < lines.length && indentOf(lines[i]) === ind && lines[i].trim().startsWith("- ")) {
        const rest = lines[i].trim().slice(2);
        i++;
        if (rest.includes(": ") || rest.endsWith(":")) {
          // inline map start on dash line — treat as nested object
          i--;
          // rewrite current as key line without dash for parseMap continuity
          const fake = " ".repeat(ind + 2) + rest;
          lines[i] = fake;
          const obj = parseMap(ind + 2);
          arr.push(obj);
        } else if (rest === "" || rest === "|" || rest === ">") {
          arr.push(parseBlock(ind + 2));
        } else {
          arr.push(parseScalar(rest));
        }
      }
      return arr;
    }
    return parseMap(ind);
  }

  function parseMap(minIndent) {
    const obj = {};
    while (i < lines.length) {
      const line = lines[i];
      const ind = indentOf(line);
      if (ind < minIndent) break;
      if (ind > minIndent && Object.keys(obj).length) {
        // nested content belongs to previous key — handled below
        break;
      }
      if (line.trim().startsWith("- ")) break;
      const trimmed = line.trim();
      const colon = trimmed.indexOf(":");
      if (colon < 0) {
        i++;
        continue;
      }
      const key = trimmed.slice(0, colon).trim();
      const after = trimmed.slice(colon + 1).trim();
      i++;
      if (after === "" || after === "|" || after === ">") {
        // peek child
        if (i < lines.length && indentOf(lines[i]) > ind) {
          if (lines[i].trim().startsWith("- ")) obj[key] = parseBlock(ind + 1);
          else obj[key] = parseMap(indentOf(lines[i]));
        } else obj[key] = null;
      } else {
        obj[key] = parseScalar(after);
      }
    }
    return obj;
  }

  function parseScalar(s) {
    if (s === "true") return true;
    if (s === "false") return false;
    if (s === "null" || s === "~") return null;
    if (/^-?\d+$/.test(s)) return Number(s);
    if (/^-?\d+\.\d+$/.test(s)) return Number(s);
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    )
      return s.slice(1, -1);
    // flow array [a, b]
    if (s.startsWith("[") && s.endsWith("]")) {
      return s
        .slice(1, -1)
        .split(",")
        .map((x) => parseScalar(x.trim()))
        .filter((x) => x !== "");
    }
    return s;
  }

  const rootInd = indentOf(lines[0]);
  if (lines[0].trim().startsWith("- ")) return parseBlock(rootInd);
  return parseMap(rootInd);
}
