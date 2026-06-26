"""
成知成语卡 - 插图压缩脚本（纯净版）
策略：最长边>1600px 则等比缩小，统一用 JPEG q=82 重存，去除 EXIF
只覆盖真正变小的文件
"""

import os
import sys
import shutil
import time

ILLUS_DIR = r"D:\Desktop\成知应用开发\2026-05-14-task-5\v8\illus"
JPEG_QUALITY = 82
MAX_SIZE = 1600
SUPPORTED = ('.jpg', '.jpeg', '.png', '.webp', '.bmp')

def compress_one(fname):
    path = os.path.join(ILLUS_DIR, fname)
    ext = os.path.splitext(fname)[1].lower()
    if ext not in SUPPORTED:
        return None, None, False

    from PIL import Image
    try:
        img = Image.open(path)
        # 转 RGB（处理 RGBA/P 模式）
        if img.mode in ('RGBA', 'P', 'LA'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            bg.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # 等比缩小
        w, h = img.size
        if max(w, h) > MAX_SIZE:
            scale = MAX_SIZE / max(w, h)
            nw, nh = int(w * scale), int(h * scale)
            img = img.resize((nw, nh), Image.LANCZOS)

        # 先存到脚本目录的临时文件（避免同目录锁冲突）
        tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), fname + '.tmp.jpg')
        img.save(tmp, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
        img.close()

        orig_size = os.path.getsize(path)
        new_size = os.path.getsize(tmp)

        if new_size < orig_size:
            # 尝试覆盖，若被锁则重试3次
            for _attempt in range(3):
                try:
                    os.replace(tmp, path)
                    return orig_size, new_size, True
                except PermissionError:
                    time.sleep(0.5)
            # 仍失败，回退用 shutil.copyfile
            try:
                shutil.copyfile(tmp, path)
                os.remove(tmp)
                return orig_size, new_size, True
            except Exception:
                os.remove(tmp)
                return orig_size, orig_size, False
        else:
            os.remove(tmp)
            return orig_size, orig_size, False
    except Exception as e:
        # 清理可能的临时文件
        for t in (
            os.path.join(os.path.dirname(os.path.abspath(__file__)), fname + '.tmp.jpg'),
            path + '.tmp.jpg'
        ):
            try:
                if os.path.exists(t): os.remove(t)
            except:
                pass
        return None, None, False

def main():
    files = sorted([
        f for f in os.listdir(ILLUS_DIR)
        if os.path.splitext(f)[1].lower() in SUPPORTED
    ])

    print(f"共找到 {len(files)} 张图片，开始压缩...")
    total_before = 0
    total_after = 0
    saved = 0
    skipped = 0
    errors = 0

    for i, fname in enumerate(files, 1):
        before, after, ok = compress_one(fname)
        if before is None:
            errors += 1
            print(f"[{i}/{len(files)}] ERR  {fname}")
            continue

        pct = (after / before * 100) if before > 0 else 100
        if ok:
            saved += 1
            total_before += before
            total_after += after
            tag = "SAVED" if before > 10240 else "small"
        else:
            skipped += 1
            tag = "skip "

        bar = f"[{i}/{len(files)}] {tag}  {fname[:28]:<30} {before/1024:.1f}KB -> {after/1024:.1f}KB ({pct:.1f}%)"
        print(bar)

    print("\n" + "="*50)
    if total_before > 0:
        tot_pct = total_after / total_before * 100
        print(f"压缩完成：{saved} 张压缩，{skipped} 张跳过，{errors} 张失败")
        print(f"总大小：{total_before/1048576:.1f} MB -> {total_after/1048576:.1f} MB ({tot_pct:.1f}%)")
        print(f"节省空间：{(total_before-total_after)/1048576:.1f} MB")
    else:
        print(f"无需压缩的文件：{skipped} 张，错误：{errors} 张")

if __name__ == '__main__':
    main()
