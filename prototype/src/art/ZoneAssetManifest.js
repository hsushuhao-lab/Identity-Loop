import { preloadAssetNames } from './AssetRegistry.js';
import { preloadMaterialSurfaces } from './MaterialRegistry.js';

const clinicalSurfaces = ['plaster', 'vinyl', 'terrazzo', 'wood'];
const clinicalFurniture = ['officeChair', 'storageCabinet', 'workDesk', 'printer', 'bench', 'plant'];
const exteriorModels = ['shrub', 'fern', 'campusTree'];
const indoor = models => ({ essential: { models, surfaces: clinicalSurfaces }, optional: { models: [], surfaces: [] } });
const withExterior = models => ({ essential: { models, surfaces: clinicalSurfaces }, optional: { models: exteriorModels, surfaces: ['ground', 'asphalt'] } });

export const zoneAssetManifest = Object.freeze({
  first_campus_3f: withExterior(clinicalFurniture),
  first_campus_4f: indoor([...clinicalFurniture, 'hospitalBed']),
  first_campus_2f: withExterior([...clinicalFurniture, 'hospitalBed']),
  first_campus_1f: withExterior(clinicalFurniture),
  first_campus_8f: withExterior(clinicalFurniture),
  // Skybridge scenery uses procedural distant silhouettes; campusTree is not on the entry path.
  skybridge: { essential: { models: clinicalFurniture, surfaces: clinicalSurfaces }, optional: { models: ['shrub', 'fern'], surfaces: ['ground', 'asphalt'] } },
  second_campus_1f: { essential: { models: clinicalFurniture, surfaces: clinicalSurfaces }, optional: { models: [], surfaces: ['ground', 'asphalt'] } },
  second_campus_2f: indoor([...clinicalFurniture, 'hospitalBed']),
  second_campus_4f_story: indoor([...clinicalFurniture, 'hospitalBed']),
  second_campus_5f: indoor([...clinicalFurniture, 'hospitalBed']),
  second_campus_std: indoor([...clinicalFurniture, 'hospitalBed']),
  phantom_6f: indoor(clinicalFurniture),
  b2_archive: indoor(clinicalFurniture),
  b1_dispatch_hub: indoor(clinicalFurniture)
});

function preloadEntries(entries,optional=false) {
  return Promise.all([
    preloadAssetNames(entries.models,{optional}),
    preloadMaterialSurfaces(entries.surfaces,{optional})
  ]);
}

export async function preloadZoneEssential(zoneId) {
  const manifest = zoneAssetManifest[zoneId];
  if (!manifest) throw new Error(`Missing zone asset manifest: ${zoneId}`);
  for(let attempt=0;attempt<3;attempt++) {
    try {return await preloadEntries(manifest.essential);}
    catch(error) {
      if(attempt===2)throw error;
      await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
    }
  }
}

export function preloadZoneOptional(zoneId) {
  const manifest = zoneAssetManifest[zoneId];
  if (!manifest) throw new Error(`Missing zone asset manifest: ${zoneId}`);
  return preloadEntries(manifest.optional,true);
}
