function deepEqual(left, right) {
  if (left === right) return true;
  if (typeof left !== typeof right) return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return (
      left.length === right.length &&
      left.every((value, index) => deepEqual(value, right[index]))
    );
  }

  if (left && right && typeof left === "object") {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    if (!leftKeys.every((key, index) => key === rightKeys[index])) return false;
    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }

  return false;
}

function display(value) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? `${item}n` : item,
  );
}

export class IntentMismatchError extends Error {
  constructor(differences) {
    super(`Transaction does not match intent: ${differences.join("; ")}`);
    this.name = "IntentMismatchError";
    this.differences = differences;
  }
}

export function assertMatchesIntent(description, intent) {
  const differences = [];

  if (!description || !Array.isArray(description.operations)) {
    throw new IntentMismatchError(["transaction description has no operations"]);
  }

  if (description.operations.length !== 1) {
    differences.push(
      `expected exactly 1 operation, got ${description.operations.length}`,
    );
  }

  const operation = description.operations.find(
    (candidate) => candidate.type === "invokeContract",
  );

  if (!operation) {
    differences.push(
      `expected an invokeContract operation, got ${description.operations[0]?.type ?? "none"}`,
    );
  } else {
    if (operation.contractId !== intent.contractId) {
      differences.push(
        `contractId: expected ${intent.contractId}, got ${operation.contractId}`,
      );
    }
    if (operation.fn !== intent.fn) {
      differences.push(`fn: expected ${intent.fn}, got ${operation.fn}`);
    }

    const actualArgs = operation.args ?? [];
    const expectedArgs = intent.args ?? [];
    if (actualArgs.length !== expectedArgs.length) {
      differences.push(
        `args length: expected ${expectedArgs.length}, got ${actualArgs.length}`,
      );
    }
    const sharedLength = Math.min(actualArgs.length, expectedArgs.length);
    for (let index = 0; index < sharedLength; index += 1) {
      if (!deepEqual(actualArgs[index], expectedArgs[index])) {
        differences.push(
          `arg ${index}: expected ${display(expectedArgs[index])}, got ${display(actualArgs[index])}`,
        );
      }
    }
  }

  if (differences.length > 0) {
    throw new IntentMismatchError(differences);
  }

  return true;
}
