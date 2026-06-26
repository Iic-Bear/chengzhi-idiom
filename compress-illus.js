/**
 * 成知·成语卡 — 插图批量压缩脚本
 *
 * 用途：
 *   1. 等比缩放：宽或高 > 1600px 的图，等比缩小到最长边 = 1600px
 *   2. JPEG 重压缩：质量 85，去掉 EXIF / 元数据
 *   3. 原地替换：直接用压缩后的文件覆盖原文件
 *   4. 汇报结果：每张图的压缩比、总节省空间
 *
 * 用法：
 *   node compress-illus.js
 *
 * 依赖：
 *   npm install sharp   （先在项目的 Node 环境里安装）
 *
 * 注意：
 *   - 建议先在 illus/ 的副本里试跑，确认画质可接受再覆盖原文件
 *   - sharp 比 Pillow 更快，且对 JPEG 的压缩质量更好
 */

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const ILLUS_DIR   = path.join(__dirname, 'illus');
const MAX_DIM     = 1600;          // 最长边上限（px）
const JPEG_QUALITY = 85;            // JPEG 质量（0-100，85 肉眼无损）

async function compressOne(file) {
  const src = path.join(ILLUS_DIR, file);
  const tmp = src + '.tmp.jpg';

  const stBefore = fs.statSync(src);
  const beforeKB = (stBefore.size / 1024).toFixed(1);

  let pipeline = sharp(src, { failOnError: false });

  // 获取尺寸，决定是否缩放
  const meta = await pipeline.metadata();
  const { width, height } = meta;

  if (width > MAX_DIM || height > MAX_DIM) {
    pipeline = pipeline.resize({
      width:  width  > height ? MAX_DIM : undefined,
      height: height > width  ? MAX_DIM : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  await pipeline
    .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true, strip: true })
    .toFile(tmp);

  const stAfter = fs.statSync(tmp);
  const afterKB = (stAfter.size / 1024).toFixed(1);
  const ratio   = (stAfter.size / stBefore.size * 100).toFixed(1);

  // 只有真的小了才替换
  if (stAfter.size < stBefore.size) {
    fs.renameSync(tmp, src);
    return { file, beforeKB, afterKB, ratio, saved: true };
  } else {
    fs.unlinkSync(tmp);   // 没变小，删掉临时文件
    return { file, beforeKB, beforeKB, ratio: '100.0', saved: false };
  }
}

(async () => {
  const files = fs.readdirSync(ILLUS_DIR)
    .filter(f => /\.(jpe?g|png)$/i.test(f));

  console.log(`共 ${files.length} 张图片，开始压缩…\n`);

  let totalBefore = 0;
  let totalAfter  = 0;
  let done = 0;

  for (const file of files) {
    done++;
    const r = await compressOne(file);
    totalBefore += parseFloat(r.beforeKB);
    if (r.saved) totalAfter += parseFloat(r.afterKB);

    const flag = r.saved ? '✅' : '⚠️ 未变小';
    console.log(`[${done}/${files.length}] ${flag}  ${r.file.padEnd(35)}  ${r.beforeKB.padStart(8)} KB → ${r.afterKB.padStart(8)} KB  (${r.ratio}%)`);
  }

  console.log(`\n✅ 完成！`);
  console.log(`压缩前总计：${(totalBefore/1024).toFixed(1)} MB`);
  console.log(`压缩后总计：${(totalAfter /1024).toFixed(1)} MB`);
  console.log(`节省空间：  ${((totalBefore - totalAfter)/1024).toFixed(1)} MB`);
})();
