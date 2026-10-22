// Load-time draw-call batching. The hub is built from hundreds of small static meshes (pedestal
// parts, railings, roof slabs, cliff blocks...). mergeStatic() bakes every static mesh under a root
// into world space and merges the ones that share a material (and shadow flags) into a single
// mesh, so the GPU sees one draw per material instead of one per part. Anything animated must be
// flagged with markDynamic() before the pass; sprites, instanced and multi-material meshes are left
// as they are.
import { Group, InstancedMesh, LOD, Matrix4, Mesh, Object3D, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FOG } from '../config.js'

export function markDynamic(...objects) {
  for (const o of objects) o.userData.dynamic = true
}

function isDynamic(o, root) {
  for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return true
  return false
}

export function mergeStatic(root) {
  root.updateMatrixWorld(true)
  const toRoot = new Matrix4().copy(root.matrixWorld).invert()
  const buckets = new Map()
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || isDynamic(o, root)) return
    const g = o.geometry
    const attrs = Object.keys(g.attributes).sort().join(',')
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${attrs}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(o)
  })
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue
    const geos = meshes.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      g.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, m.matrixWorld))
      for (const name of Object.keys(g.morphAttributes)) delete g.morphAttributes[name]
      return g
    })
    const merged = mergeGeometries(geos)
    if (!merged) continue
    const first = meshes[0]
    const batch = new Mesh(merged, first.material)
    batch.castShadow = first.castShadow
    batch.receiveShadow = first.receiveShadow
    batch.renderOrder = first.renderOrder
    root.add(batch)
    for (const m of meshes) m.removeFromParent()
  }
}

// Instances strung out along the 75 km slide (wall lights, the summit's clouds): split into
// `chunk`-metre pieces along Z, one InstancedMesh each under an LOD that draws it only while the
// camera is within `reach` of the piece's centre (past the fog it would only cost triangles).
// `matrices` are world-space; returns a Group to add to the scene.
export function nearInstances(geometry, material, matrices, { chunk = 400, reach = FOG.far + chunk } = {}) {
  const group = new Group()
  const pieces = new Map()
  const at = new Vector3()
  for (const m of matrices) {
    at.setFromMatrixPosition(m)
    const k = Math.floor(at.z / chunk)
    if (!pieces.has(k)) pieces.set(k, [])
    pieces.get(k).push(m)
  }
  for (const list of pieces.values()) {
    const centre = new Vector3()
    for (const m of list) centre.add(at.setFromMatrixPosition(m))
    centre.divideScalar(list.length)
    const mesh = new InstancedMesh(geometry, material, list.length)
    const local = new Matrix4()
    list.forEach((m, i) => {
      local.copy(m)
      local.elements[12] -= centre.x
      local.elements[13] -= centre.y
      local.elements[14] -= centre.z
      mesh.setMatrixAt(i, local)
    })
    mesh.computeBoundingSphere()
    const lod = new LOD()
    lod.position.copy(centre)
    lod.addLevel(mesh, 0)
    lod.addLevel(new Object3D(), reach)
    group.add(lod)
  }
  return group
}
