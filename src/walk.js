export const EYE_HEIGHT = 1.65;

const MAX_STRIDE = 0.16;
const MAX_STEP_HEIGHT = 0.36;

export function advanceWalker(world, origin, displacement) {
  let { x, z } = origin;
  const steps = Math.max(1, Math.ceil(Math.hypot(displacement.x, displacement.z) / MAX_STRIDE));
  const stepX = displacement.x / steps;
  const stepZ = displacement.z / steps;

  for (let step = 0; step < steps; step += 1) {
    const ground = world.surfaceAt(x, z);
    const canStep = (nextX, nextZ) => world.canWalk(nextX, nextZ)
      && Math.abs(world.surfaceAt(nextX, nextZ) - ground) <= MAX_STEP_HEIGHT;
    if (canStep(x + stepX, z + stepZ)) {
      x += stepX;
      z += stepZ;
    } else if (stepX && canStep(x + stepX, z)) {
      x += stepX;
    } else if (stepZ && canStep(x, z + stepZ)) {
      z += stepZ;
    }
  }

  return { x, z };
}
