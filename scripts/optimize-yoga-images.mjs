import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const inputDir = path.join(projectRoot, 'public', 'yoga', 'poses');
const thumbDir = path.join(inputDir, 'thumb');
const fullDir = path.join(inputDir, 'full');

const THUMB_WIDTH = 320;
const FULL_WIDTH = 1200;
const WEBP_QUALITY_THUMB = 72;
const WEBP_QUALITY_FULL = 82;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const bytesToKB = (bytes) => Math.round((bytes / 1024) * 100) / 100;

const run = async () => {
  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  ensureDir(thumbDir);
  ensureDir(fullDir);

  const files = fs
    .readdirSync(inputDir)
    .filter((fileName) => /\.(png|jpg|jpeg|webp)$/i.test(fileName))
    .filter((fileName) => !fileName.startsWith('.'));

  if (files.length === 0) {
    console.log('No source image found in public/yoga/poses');
    return;
  }

  for (const fileName of files) {
    const inputPath = path.join(inputDir, fileName);

    if (fs.statSync(inputPath).isDirectory()) {
      continue;
    }

    const poseId = path.parse(fileName).name;
    const thumbOutputPath = path.join(thumbDir, `${poseId}.webp`);
    const fullOutputPath = path.join(fullDir, `${poseId}.webp`);

    await sharp(inputPath)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY_THUMB, effort: 6 })
      .toFile(thumbOutputPath);

    await sharp(inputPath)
      .rotate()
      .resize({ width: FULL_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY_FULL, effort: 6 })
      .toFile(fullOutputPath);

    const sourceBytes = fs.statSync(inputPath).size;
    const thumbBytes = fs.statSync(thumbOutputPath).size;
    const fullBytes = fs.statSync(fullOutputPath).size;

    console.log(`\n${poseId}`);
    console.log(`  source: ${bytesToKB(sourceBytes)} KB (${fileName})`);
    console.log(`  thumb : ${bytesToKB(thumbBytes)} KB (${path.relative(projectRoot, thumbOutputPath)})`);
    console.log(`  full  : ${bytesToKB(fullBytes)} KB (${path.relative(projectRoot, fullOutputPath)})`);
  }

  console.log('\nDone. Optimized yoga images generated.');
};

run().catch((error) => {
  console.error('Failed to optimize yoga images:', error);
  process.exit(1);
});
