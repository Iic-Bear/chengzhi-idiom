#!/usr/bin/env python3
"""将 illus/ 中 ID 105+ 的中文文件名批量重命名为拼音格式"""
import os
import re
from pypinyin import pinyin, Style

illus_dir = os.path.dirname(os.path.abspath(__file__)) + '/illus'
pattern = re.compile(r'^ID (\d{3,}) (.+)\.(.+)$')

renamed = []
new_mappings = []

for fname in sorted(os.listdir(illus_dir)):
    m = pattern.match(fname)
    if not m:
        continue
    num = int(m.group(1))
    idiom = m.group(2)
    ext = m.group(3)

    # 转拼音：用不带声调的格式，不加空格
    py = pinyin(idiom, style=Style.NORMAL)
    py_str = ''.join([p[0] for p in py])

    new_name = f'id{num}_{py_str}.{ext}'
    old_path = os.path.join(illus_dir, fname)
    new_path = os.path.join(illus_dir, new_name)

    os.rename(old_path, new_path)
    renamed.append((fname, new_name))
    new_mappings.append(f"  {num}:'{new_name}',")

    if len(renamed) <= 5 or len(renamed) % 50 == 0:
        print(f"  {fname} -> {new_name}")

print(f"\n总计重命名: {len(renamed)} 个文件")
print(f"\n=== ILLUS_FILE 新映射（ID {min(m[0] for m in [(int(re.match(r'ID (\d+)', rn[0]).group(1)), rn) for rn in renamed])}~{max(m[0] for m in [(int(re.match(r'ID (\d+)', rn[0]).group(1)), rn) for rn in renamed])}) ===\n")
for line in new_mappings:
    print(line)
