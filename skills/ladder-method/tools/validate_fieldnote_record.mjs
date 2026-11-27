// Standalone check of a Fieldnote import file (LadderRecord v1), with no dependencies.
// Port of @fieldnote/ladder-core 0.5.1: recordEngine.parseRecord, import-validation.validateRecord,
// record-io.prepareImport (25 MB limit, the fieldnote.ladder envelope). Same messages as the app.
// Usage: node validate_fieldnote_record.mjs FILE.json   (exit 0 = Fieldnote would import it)
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
const COLLECTIONS = ["panels","observations","groups","abstractions","implications","tests","convergences","invariants","repairs"];
const ID_PATTERNS = {panel:/^P-\d{4,}$/,observation:/^O-\d{4,}$/,group:/^G-\d{3,}$/,abstraction:/^A-\d{3,}$/,implication:/^I-\d{4,}$/,test:/^T-\d{4,}$/,convergence:/^C-\d{3,}$/,invariant:/^INV-\d{2,}$/,repair:/^R-\d{3,}$/};
const EXAMPLE_IDS = {panel:"P-0001",observation:"O-0001",group:"G-001",abstraction:"A-001",implication:"I-0001",test:"T-0001",convergence:"C-001",invariant:"INV-01",repair:"R-001"};
const ABSTRACTION_STATUSES = ["live","live_barren","live_light","narrowed","split","discarded","tested_live"];
const EDGE_ENDPOINTS = {related:[["*","*"]],requires:[["*","*"]],member_of:[["observation","group"],["abstraction","group"]],source_of:[["group","abstraction"]],
  entails:[["abstraction","implication"]],tested_by:[["implication","test"]],predecessor:[["test","test"],["abstraction","abstraction"],["group","group"],["abstraction","repair"]],
  successor:[["repair","abstraction"]],killed_by:[["observation","test"],["group","test"],["abstraction","test"],["implication","test"]],
  supports:[["observation","repair"],["test","repair"],["observation","test"],["convergence","invariant"]],path_of:[["abstraction","convergence"]],parent_of:[["abstraction","abstraction"]]};
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const isTimestamp = v => typeof v === "string" && ISO_TS.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const withArticle = w => `${/^[aeiou]/i.test(w) ? "an" : "a"} ${w}`;
const importByteLength = raw => new TextEncoder().encode(raw).length;
function assert(c, m) { if (!c) throw new Error(m); }
const allNodes = r => COLLECTIONS.flatMap(k => Array.isArray(r[k]) ? r[k] : []);

function parseRecord(raw) {
  let r;
  try { r = JSON.parse(raw); } catch { throw new Error("This file is not a Fieldnote record. Your current record is unchanged."); }
  assert(r && r.version === 1, "This record version is not supported. The original data has been preserved.");
  for (const k of COLLECTIONS) assert((k === "panels" && r[k] === undefined) || Array.isArray(r[k]), `Record is missing ${k}.`);
  assert(Array.isArray(r.edges), "Record is missing relationships.");
  const nodes = allNodes(r), ids = new Set(), kinds = new Map(nodes.map(n => [n && n.id, n && n.kind]));
  for (const n of nodes) {
    assert(n && typeof n.id === "string" && typeof n.kind === "string" && typeof n.archived === "boolean", "Invalid record object.");
    assert(n.draft === undefined || typeof n.draft === "boolean", "Invalid draft state.");
    assert(!ids.has(n.id), `Duplicate object ${n.id}.`); ids.add(n.id);
    assert(n.tags === undefined || (Array.isArray(n.tags) && n.tags.every(t => typeof t === "string")), "Invalid retrieval labels.");
    if (n.boardSize) assert(Number.isFinite(n.boardSize.width) && Number.isFinite(n.boardSize.height) && n.boardSize.width >= 150 && n.boardSize.height >= 100 && n.boardSize.width <= 1200 && n.boardSize.height <= 1000, "Invalid board size.");
    if (n.layout) assert(Number.isFinite(n.layout.x) && Number.isFinite(n.layout.y), "Invalid board position.");
  }
  for (const p of r.panels || []) assert(p.sourceNodeId === undefined || ids.has(p.sourceNodeId), "The planned work source is missing.");
  for (const o of r.observations) assert(o.kind === "observation" && typeof o.text === "string" && Array.isArray(o.groupIds) && typeof (o.provenance || {}).source === "string" && typeof (o.provenance || {}).firstEncounter === "string", "Invalid observation.");
  for (const g of r.groups) assert(g.kind === "group" && typeof g.tag === "string" && Array.isArray(g.memberIds) && g.memberIds.every(id => ids.has(id)), "Invalid group membership.");
  for (const a of r.abstractions) assert(a.kind === "abstraction" && typeof a.statement === "string" && (kinds.get(a.sourceGroupId) === "group" || (a.draft === true && a.sourceGroupId === "")) && Number.isInteger(a.tier), "Invalid abstraction source.");
  for (const g of r.groups) {
    assert(g.tagIcon === undefined || typeof g.tagIcon === "string", "Invalid group symbol: it must be a string or omitted.");
    assert(g.tagColor === undefined || (typeof g.tagColor === "string" && (g.tagColor === "" || /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(g.tagColor))), "Invalid group color: use #RGB, #RRGGBB, #RRGGBBAA, or omit it.");
  }
  for (const t of r.tests) assert(t.kind === "test" && typeof t.evidenceNote === "string" && ids.has(t.implicationId), "Invalid test.");
  for (const rp of r.repairs) assert(rp.kind === "repair" && Array.isArray(rp.resultingAbstractionIds) && ids.has(rp.targetAbstractionId), "Invalid repair.");
  for (const e of r.edges) for (const port of [e.fromPort, e.toPort]) assert(port === undefined || ["top","right","bottom","left"].includes(port), "Invalid connection port.");
  for (const e of r.edges) assert(e && typeof e.id === "string" && ids.has(e.fromId) && ids.has(e.toId), "A relationship points to a missing object.");
  for (const g of r.groups) assert(Number.isInteger(g.tier) && g.memberIds.every(id => ["observation","abstraction"].includes(kinds.get(id) || "")), "Invalid group member kind or tier.");
  for (const i of r.implications) assert((kinds.get(i.parentAbstractionId) === "abstraction" || (i.draft === true && i.parentAbstractionId === "")) && Array.isArray(i.testIds) && i.testIds.every(id => r.tests.some(t => t.id === id && t.implicationId === i.id)), "Invalid implication test history.");
  for (const t of r.tests) assert(kinds.get(t.implicationId) === "implication" && ["external","internal","none"].includes(t.channel), "Invalid test source or channel.");
  for (const rp of r.repairs) assert(kinds.get(rp.targetAbstractionId) === "abstraction" && ["narrow","split","discard"].includes(rp.outcome) && typeof rp.antiAdHocReceipt === "string" && rp.resultingAbstractionIds.every(id => kinds.get(id) === "abstraction"), "Invalid repair history.");
  for (const c of r.convergences) assert(c.kind === "convergence" && typeof c.sharedImplicationOrStatement === "string" && Array.isArray(c.pathIds) && Array.isArray(c.pathProvenance), "Invalid convergence record.");
  for (const inv of r.invariants) assert(inv.kind === "invariant" && typeof inv.statement === "string" && Array.isArray(inv.supportingConvergenceIds) && Array.isArray(inv.testedImplicationIds), "Invalid invariant record.");
  if (r.board) assert(Number.isFinite(r.board.offsetX) && Number.isFinite(r.board.offsetY) && Number.isFinite(r.board.zoom) && r.board.zoom > 0, "Invalid saved camera.");
  return r;
}
function validateRecord(r) {
  const out = [];
  try {
    const nodes = allNodes(r), kinds = new Map(nodes.map(n => [n && n.id, n && n.kind]));
    for (const n of nodes) if (!(ID_PATTERNS[n && n.kind] || {test: () => false}).test(n && n.id))
      out.push({rule:"id-format", objectId:n && n.id, message:`Invalid object ID ${n && n.id}. Expected ${withArticle(String(n && n.kind))} ID such as ${EXAMPLE_IDS[n && n.kind] || "O-0001"}.`});
    const edgeIds = new Set();
    for (const e of Array.isArray(r.edges) ? r.edges : []) {
      if (edgeIds.has(e && e.id)) out.push({rule:"edge-duplicate", objectId:e.id, message:`Duplicate relationship ${e.id}.`});
      edgeIds.add(e && e.id);
      const allowed = EDGE_ENDPOINTS[e && e.kind];
      if (!allowed) { out.push({rule:"edge-kind", objectId:e && e.id, message:`Relationship ${e && e.id} has an unknown kind.`}); continue; }
      const from = kinds.get(e.fromId) || "missing object", to = kinds.get(e.toId) || "missing object";
      if (!allowed.some(([f, t]) => (f === "*" || f === from) && (t === "*" || t === to)))
        out.push({rule:"edge-endpoints", objectId:e.id, message:`Relationship ${e.id} (${e.kind}) cannot connect ${withArticle(from)} to ${withArticle(to)}.`});
    }
    for (const o of Array.isArray(r.observations) ? r.observations : []) {
      if (Array.isArray(o && o.groupIds) && !o.groupIds.every(id => kinds.get(id) === "group")) out.push({rule:"group-reference", objectId:o.id, message:`Observation ${o.id} belongs to a group that is missing from this record.`});
      if (typeof (o && o.text) === "string" && /[?？]\s*$/.test(o.text)) out.push({rule:"question-observation", objectId:o.id, message:`Observation ${o.id} is a question. Record a statement, rather than a question.`});
    }
    for (const a of Array.isArray(r.abstractions) ? r.abstractions : []) if (!ABSTRACTION_STATUSES.includes(a && a.status)) out.push({rule:"abstraction-status", objectId:a && a.id, message:`Abstraction ${a && a.id} has an unknown status.`});
    const tests = Array.isArray(r.tests) ? r.tests : [];
    for (const i of Array.isArray(r.implications) ? r.implications : [])
      if (!["untested","invalid_derivation"].includes(i && i.status) && !tests.some(t => t && t.implicationId === i.id && t.result === i.status))
        out.push({rule:"untested-pass", objectId:i && i.id, message:`Implication ${i && i.id} is marked ${i && i.status} without a recorded test. Untested is not passed.`});
    for (const c of Array.isArray(r.convergences) ? r.convergences : [])
      if (!(c && c.candidateOnly === true) || (c && c.independence === "sealed")) out.push({rule:"sealed-convergence", objectId:c && c.id, message:`Convergence ${c && c.id} is sealed. Sealing is not supported yet; only candidates can be imported.`});
    const stamp = (id, field, value, required) => { if ((value !== undefined || required) && !isTimestamp(value)) out.push({rule:"timestamp-format", objectId:typeof id === "string" ? id : undefined, message:`${id} has an invalid ${field} time. Use the format 2026-10-19T20:00:00.000Z.`}); };
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      stamp(n.id, "createdAt", n.createdAt, true); stamp(n.id, "updatedAt", n.updatedAt, true);
      stamp(n.id, "provenance.recordedAt", n.provenance && n.provenance.recordedAt); stamp(n.id, "testedAt", n.testedAt, n.kind === "test");
      stamp(n.id, "completedAt", n.completedAt); stamp(n.id, "work.completedAt", n.work && n.work.completedAt); stamp(n.id, "death.archivedAt", n.death && n.death.archivedAt);
      for (const p of Array.isArray(n.pathProvenance) ? n.pathProvenance : []) stamp(n.id, "pathProvenance.recordedAt", p && p.recordedAt);
      for (const h of [...(Array.isArray(n.history) ? n.history : []), ...(Array.isArray(n.work && n.work.history) ? n.work.history : []), ...(Array.isArray(n.edits) ? n.edits : [])]) stamp(n.id, "history", h && h.at, true);
    }
    for (const e of Array.isArray(r.edges) ? r.edges : []) stamp(e && e.id, "createdAt", e && e.createdAt, true);
    if (r.board && !(r.board.zoom >= 0.01 && r.board.zoom <= 100)) out.push({rule:"camera-zoom", message:"Invalid saved camera: zoom must be between 1% and 10,000%."});
  } catch { out.push({rule:"unreadable", message:"This record could not be checked against the import rules."}); }
  return out;
}
function unwrap(raw) {
  let v; try { v = JSON.parse(raw); } catch { return raw; }
  if (v && typeof v === "object" && v.format === "fieldnote.ladder" && v.record && typeof v.record === "object") {
    if (v.formatVersion !== 1) throw new Error("This Fieldnote file uses a newer format.");
    return JSON.stringify(v.record);
  }
  return raw;
}
function prepareImport(raw) {
  if (raw.length > MAX_IMPORT_BYTES || (raw.length * 3 > MAX_IMPORT_BYTES && importByteLength(raw) > MAX_IMPORT_BYTES))
    throw new Error("This file is larger than 25 MB and was not imported. Your current record is unchanged.");
  const r = parseRecord(unwrap(raw)); const [first] = validateRecord(r);
  if (first) throw new Error(first.message);
  delete r.board; return r;
}
export const exportFileName = (name, d = new Date()) => `fieldnote-${(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "tree")}-${d.toISOString().slice(0, 10)}.json`;

export { parseRecord, validateRecord, prepareImport };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2]) {
  const raw = readFileSync(process.argv[2], "utf8");
  try {
    const r = prepareImport(raw);
    const n = k => (r[k] || []).length;
    console.log(`ACCEPTED: ${n("observations")} observations, ${n("groups")} groups, ${n("abstractions")} abstractions, ${n("implications")} implications, ${n("tests")} tests, ${n("repairs")} repairs, ${n("edges")} links`);
  } catch (e) { console.log("REFUSED: " + e.message); process.exitCode = 1; }
}
