const PROVIDER_PATTERNS = [
  { kind: 'openai-token', pattern: /\bsk-(?:proj-|live-)?[A-Za-z0-9_-]{20,}\b/ },
  { kind: 'github-token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { kind: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { kind: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { kind: 'slack-token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/ },
  { kind: 'stripe-secret-key', pattern: /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/ },
  { kind: 'sendgrid-token', pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ },
];

const PRIVATE_KEY_HEADER = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;
const COMMENT_LINE = /^(?:\/\/|#|\/\*|\*|<!--)/;
const EXAMPLE_MARKER = /(?:\b(?:example|sample|dummy|fake|fixture|mock|placeholder)\b|\b(?:example|sample|dummy|fake|fixture|mock|placeholder)(?:token|key|secret|value|password)\b|(?:^|[-_])your(?:[-_ ]|token|key)|replace[-_ ]?me|change[-_ ]?me|do[-_ ]?not[-_ ]?use|not[-_ ]?real|\.\.\.)/i;
const PLACEHOLDER_VALUE = /^(?:your(?:[-_ ].*)?|my(?:[-_ ].*)?|replace(?:[-_ ].*)?|change(?:[-_ ].*)?|insert(?:[-_ ].*)?|enter(?:[-_ ].*)?|example(?:[-_ ].*)?|sample(?:[-_ ].*)?|dummy(?:[-_ ].*)?|fake(?:[-_ ].*)?|test(?:[-_ ].*)?|testing|fixture(?:[-_ ].*)?|mock(?:[-_ ].*)?|placeholder(?:[-_ ].*)?|redacted|changeme|changeit|letmein|password(?:123)?|secret(?:123)?|null|undefined|none|true|false|x{3,}|\*{3,}|[-_]+|<[^>]+>|\$\{[^}]+\}|\{\{[^}]+\}\}|%[^%]+%)$/i;

const CREDENTIAL_ASSIGNMENT = /(?:^|[^A-Za-z0-9])(?<name>[A-Za-z0-9_-]*(?:api[-_ ]?key|secret[-_ ]?(?:key|token)?|access[-_ ]?token|auth[-_ ]?token|bearer[-_ ]?token|client[-_ ]?secret|private[-_ ]?key|password|passwd|pwd|token|database[-_ ]?url|connection[-_ ]?string))(?:["']?)\s*(?:=|:)\s*(?<value>.+)$/i;

function isCommentLine(line) {
  return COMMENT_LINE.test(line.trim());
}

function isExampleLine(line) {
  return EXAMPLE_MARKER.test(line);
}

function isPlaceholder(value) {
  const normalized = String(value || '').trim();
  return !normalized || PLACEHOLDER_VALUE.test(normalized);
}

function isEnvironmentReference(value) {
  return /^(?:process\.env\b|import\.meta\.env\b|env\(|os\.(?:getenv|environ)\b|config\.)/i.test(value);
}

function extractAssignedValue(rawValue) {
  let value = String(rawValue || '').trim();
  value = value.replace(/\s*(?:(?:\/\/|#).*)$/, '').trim();
  value = value.replace(/[,;]\s*$/, '').trim();

  const quoted = value.match(/^["'`]([\s\S]*?)["'`]$/);
  return quoted ? quoted[1].trim() : value;
}

function isCredentialValue(value) {
  if (value.length < 8 || isPlaceholder(value) || isEnvironmentReference(value)) return false;
  if (/\$\{[^}]+\}|\{\{[^}]+\}\}|%[^%]+%/.test(value)) return false;
  if (/^[\W_]+$/.test(value)) return false;
  return true;
}

function addFinding(findings, seen, kind, line) {
  const key = `${kind}:${line}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ kind, line });
}

/**
 * Detect likely secrets without returning matched content.
 * The result is deliberately limited to a finding kind and a 1-based line number.
 */
export function detectPotentialSecrets(content) {
  const findings = [];
  const seen = new Set();
  const lines = String(content || '').split('\n');

  lines.forEach((line, index) => {
    if (!line.trim() || isCommentLine(line)) return;

    const lineNumber = index + 1;
    const lineKinds = new Set();

    for (const { kind, pattern } of PROVIDER_PATTERNS) {
      const match = line.match(pattern);
      if (match && !isPlaceholder(match[0]) && !isExampleLine(line)) {
        lineKinds.add(kind);
      }
    }

    if (PRIVATE_KEY_HEADER.test(line)) {
      const context = lines.slice(index, index + 4).join('\n');
      if (!isExampleLine(context)) lineKinds.add('private-key');
    }

    if (lineKinds.size === 0) {
      const assignment = line.match(CREDENTIAL_ASSIGNMENT);
      if (assignment) {
        const value = extractAssignedValue(assignment.groups.value);
        if (isCredentialValue(value) && !isExampleLine(line)) {
          lineKinds.add('credential-assignment');
        }
      }
    }

    lineKinds.forEach((kind) => addFinding(findings, seen, kind, lineNumber));
  });

  return findings;
}
