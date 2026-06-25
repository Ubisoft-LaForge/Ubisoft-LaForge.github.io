export class BRDFParser {
  static _normalizeShaderCode(code) {
    const lines = code.split("\n");

    return lines
      .map((line) => {
        if (
          /\bfor\s*\(/.test(line) ||
          /\bint\s+\w+\s*=/.test(line) ||
          /\bcase\s+-?\d+\s*:/.test(line)
        ) {
          return line;
        }

        return line.replace(
          /(?<![\w.])(?<![eE])(?<![eE][+-])(-?\d+)(?![\w.])/g,
          (match, value) => `${value}.0`,
        );
      })
      .join("\n");
  }

  static parse(source) {
    const result = {
      parameters: [],
      shaderCode: "",
      isFuncCode: "",
    };

    // Parse parameters section
    const paramStart = source.indexOf("::begin parameters");
    const paramEnd = source.indexOf("::end parameters");
    if (paramStart !== -1 && paramEnd !== -1) {
      const paramSection = source.slice(
        paramStart + "::begin parameters".length,
        paramEnd,
      );
      for (const line of paramSection.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) continue;
        const type = parts[0];
        const name = parts[1];

        if (type === "bool") {
          const defaultVal =
            parts[2] !== undefined ? parseInt(parts[2]) !== 0 : false;
          result.parameters.push({
            type: "bool",
            name,
            default: defaultVal,
            min: 0,
            max: 1,
          });
        } else if (type === "float") {
          const min = parseFloat(parts[2] ?? "0");
          // if (min == 0.0) {
          //   min = 0.001; //prevent division by zero in shader code
          // }
          const max = parseFloat(parts[3] ?? "1");
          const def = parseFloat(parts[4] ?? parts[2] ?? "0");
          result.parameters.push({
            type: "float",
            name,
            default: def,
            min,
            max,
          });
        } else if (type === "int") {
          const min = parseInt(parts[2] ?? "0");
          const max = parseInt(parts[3] ?? "1");
          const def = parseInt(parts[4] ?? parts[2] ?? "0");
          result.parameters.push({ type: "int", name, default: def, min, max });
        } else if (type === "color") {
          // color name r g b
          result.parameters.push({
            type: "float",
            name: parts[1],
            default: parseFloat(parts[2] ?? "1"),
            min: 0,
            max: 1,
          });
        }
      }
    }

    // Parse shader section
    const shaderStart = source.indexOf("::begin shader");
    const shaderEnd = source.indexOf("::end shader");
    if (shaderStart !== -1 && shaderEnd !== -1) {
      result.shaderCode = BRDFParser._normalizeShaderCode(
        source.slice(shaderStart + "::begin shader".length, shaderEnd).trim(),
      );
    }

    // Parse isFunc section
    const isFuncStart = source.indexOf("::begin isFunc");
    const isFuncEnd = source.indexOf("::end isFunc");
    if (isFuncStart !== -1 && isFuncEnd !== -1) {
      result.isFuncCode = BRDFParser._normalizeShaderCode(
        source.slice(isFuncStart + "::begin isFunc".length, isFuncEnd).trim(),
      );
    }

    return result;
  }
}
