// Quick test script to verify subareas are populated
import { AREAS_WITH_SUBAREAS } from './src/constants/areas-with-subareas.ts';

const stats = {};
let totalSubareas = 0;

AREAS_WITH_SUBAREAS.forEach(area => {
  const count = area.subareas?.length || 0;
  totalSubareas += count;
  if (!stats[area.elementId]) stats[area.elementId] = [];
  stats[area.elementId].push({ name: area.name, subareas: count });
});

console.log('=== SUBAREA POPULATION SUMMARY ===\n');
Object.entries(stats).forEach(([element, areas]) => {
  console.log(`${element.toUpperCase()}:`);
  areas.forEach(a => console.log(`  ${a.name}: ${a.subareas} subareas`));
  console.log('');
});

console.log(`✅ Total subareas populated: ${totalSubareas}`);
console.log(`✅ Total parent areas: ${AREAS_WITH_SUBAREAS.length}`);

// Sample output
const terraArea = AREAS_WITH_SUBAREAS.find(a => a.id === 'area-saude');
if (terraArea && terraArea.subareas?.length > 0) {
  console.log(`\n📋 Sample - Saúde Física subareas:`);
  terraArea.subareas.slice(0, 3).forEach(sub => {
    console.log(`   - ${sub.name}`);
  });
}
