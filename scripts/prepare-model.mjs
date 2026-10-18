// Lossless packaging: retain the interior bay and coach shell, prune unused
// rooms/materials/textures, and preserve the supplied model's author metadata.
import fs from 'node:fs';
import path from 'node:path';
const input = process.argv[2] || 'indian_train__interior__exterior.glb';
const output = process.argv[3] || 'assets/train-compartment.glb';
const raw = fs.readFileSync(input);
if (raw.toString('ascii', 0, 4) !== 'glTF' || raw.readUInt32LE(4) !== 2) throw new Error('Expected a glTF 2 GLB.');
const jsonLength = raw.readUInt32LE(12);
const original = JSON.parse(raw.subarray(20, 20 + jsonLength).toString());
const binary = raw.subarray(28 + jsonLength);
if (original.animations?.length || original.skins?.length) throw new Error('This packer expects the supplied static coach.');
const d = structuredClone(original);
const selected = new Set();
const coach = d.nodes.findIndex(n => n.name === 'Train_Prefab__1__Variant');
const bay = d.nodes.findIndex(n => n.name === 'Compartment1');
if (coach < 0 || bay < 0) throw new Error('The expected compartment nodes were not found.');
d.nodes[coach].children = d.nodes[coach].children.filter(i => i === bay || /_Outside_0$|_Inside_0$/.test(d.nodes[i].name));
function visit(i) { selected.add(i); (d.nodes[i].children || []).forEach(visit); }
d.scenes.forEach(s => s.nodes.forEach(visit));
const sorted = values => [...new Set(values)].sort((a, b) => a - b);
const nodeIds = sorted(selected);
const meshIds = sorted(nodeIds.flatMap(i => d.nodes[i].mesh === undefined ? [] : [d.nodes[i].mesh]));
const materialIds = sorted(meshIds.flatMap(i => d.meshes[i].primitives.map(p => p.material).filter(v => v !== undefined)));
const textureIds = new Set();
function textures(value, fn) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key.endsWith('Texture') && child && typeof child === 'object' && Number.isInteger(child.index)) fn(child);
    else if (typeof child === 'object') textures(child, fn);
  }
}
materialIds.forEach(i => textures(d.materials[i], t => textureIds.add(t.index)));
const texIds = sorted(textureIds);
const imageIds = sorted(texIds.map(i => d.textures[i].source));
const samplerIds = sorted(texIds.map(i => d.textures[i].sampler).filter(v => v !== undefined));
const accessorIds = sorted(meshIds.flatMap(i => d.meshes[i].primitives.flatMap(p => [Object.values(p.attributes), p.indices === undefined ? [] : [p.indices], ...(p.targets || []).map(Object.values)].flat())));
const viewIds = sorted([
  ...accessorIds.flatMap(i => [d.accessors[i].bufferView, d.accessors[i].sparse?.indices.bufferView, d.accessors[i].sparse?.values.bufferView].filter(v => v !== undefined)),
  ...imageIds.map(i => d.images[i].bufferView)
]);
const mapping = ids => new Map(ids.map((old, i) => [old, i]));
const nm = mapping(nodeIds), mm = mapping(meshIds), matm = mapping(materialIds), tm = mapping(texIds), im = mapping(imageIds), sm = mapping(samplerIds), am = mapping(accessorIds), vm = mapping(viewIds);
d.nodes = nodeIds.map(i => { const n = d.nodes[i]; if (n.children) n.children = n.children.map(v => nm.get(v)); if (n.mesh !== undefined) n.mesh = mm.get(n.mesh); return n; });
d.scenes.forEach(s => s.nodes = s.nodes.map(i => nm.get(i)));
d.meshes = meshIds.map(i => { const m = d.meshes[i]; for (const p of m.primitives) { for (const k of Object.keys(p.attributes)) p.attributes[k] = am.get(p.attributes[k]); if (p.indices !== undefined) p.indices = am.get(p.indices); if (p.material !== undefined) p.material = matm.get(p.material); for (const target of p.targets || []) for (const k of Object.keys(target)) target[k] = am.get(target[k]); } return m; });
d.materials = materialIds.map(i => { const m = d.materials[i]; textures(m, t => t.index = tm.get(t.index)); return m; });
d.textures = texIds.map(i => { const t = d.textures[i]; t.source = im.get(t.source); if (t.sampler !== undefined) t.sampler = sm.get(t.sampler); return t; });
d.samplers = samplerIds.map(i => d.samplers[i]);
d.images = imageIds.map(i => { const image = d.images[i]; image.bufferView = vm.get(image.bufferView); return image; });
d.accessors = accessorIds.map(i => { const a = d.accessors[i]; if (a.bufferView !== undefined) a.bufferView = vm.get(a.bufferView); if (a.sparse) { a.sparse.indices.bufferView = vm.get(a.sparse.indices.bufferView); a.sparse.values.bufferView = vm.get(a.sparse.values.bufferView); } return a; });
let offset = 0;
const chunks = [];
d.bufferViews = viewIds.map(i => {
  const view = d.bufferViews[i]; const bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const padding = (4 - bytes.length % 4) % 4;
  chunks.push(bytes, Buffer.alloc(padding));
  const updated = { ...view, buffer: 0, byteOffset: offset };
  offset += bytes.length + padding; return updated;
});
d.buffers = [{ byteLength: offset }];
d.asset.extras = { ...d.asset.extras, preparation: 'First interior compartment and original coach shell; unused rooms and textures pruned losslessly. Original artist metadata retained.' };
let json = Buffer.from(JSON.stringify(d));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const bin = Buffer.concat(chunks);
const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.concat([header, json, bh, bin]));
console.log(JSON.stringify({ output, bytes: fs.statSync(output).size, originalBytes: raw.length, meshes: d.meshes.length, textures: d.images.length }));
