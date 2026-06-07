"""Batch generate idiom illustrations using Pollinations AI (free, no API key)."""
import urllib.request
import urllib.parse
import ssl
import os
import time
import sys

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "illus"))
os.makedirs(OUT_DIR, exist_ok=True)

STYLE = (
    "Minimalist illustration on plain manila paper background (#F2E8D5), "
    "thick black ink outlines only, no shading no gradients no color fills, "
    "flat 2D style like woodcut print, no text, no words, no letters, simple clean composition. "
)

IDIOMS = [
    (0, "shouzhu", "守株待兔", "a farmer sitting idle beside a tree stump in a field, a dead rabbit near the stump, waiting expectantly"),
    (1, "yanerdaoling", "掩耳盗铃", "a thief covering his ears with both hands while trying to steal a large bronze bell from a door"),
    (2, "kezhouqiujian", "刻舟求剑", "a man on a wooden boat marking the side of the boat with a knife while a sword falls into the water below"),
    (3, "huashetianzu", "画蛇添足", "a man crouching on the ground drawing a snake with a brush, adding feet to the snake"),
    (4, "wangyangbulao", "亡羊补牢", "a shepherd patching a broken wooden fence while sheep graze nearby"),
    (5, "yegonghaolong", "叶公好龙", "a man terrified and running away as a large dragon peers through a window, while dragon decorations cover the walls"),
    (6, "duiniutanqin", "对牛弹琴", "a scholar sitting and playing a guqin in front of a cow who ignores him and keeps eating grass"),
    (7, "hujiahuwei", "狐假虎威", "a fox walking proudly in front, a tiger walking behind, other animals fleeing in the background"),
    (8, "piyangqiu", "皮里阳秋", "a serene scholar sitting with a scroll, with a subtle judgmental expression, calm and composed"),
    (9, "maiduhuanzhu", "买椟还珠", "a person admiring an ornate wooden box while discarding a glowing pearl onto the ground"),
    (10, "bimenguidou", "筚门圭窦", "a humble small hut with a woven twig door and a tiny window opening in the wall"),
    (11, "muhouerguan", "沐猴而冠", "a monkey wearing a hat and scholar robes, sitting at a desk pretending to read"),
    (12, "fumofengyu", "莩末风雨", "fragile thin leaves blowing in strong wind and rain about to tear apart"),
    (13, "tihuguanding", "醍醐灌顶", "pure golden liquid being poured from above onto a meditating monk's head from a ceremonial vessel"),
    (14, "yunchouweiwo", "运筹帷幄", "a strategist standing inside a military command tent, pointing at a map on a table"),
    (15, "huangliangyimeng", "黄粱一梦", "a scholar sleeping with his head on a pillow at an inn, a pot of millet cooking on a stove beside him, dream bubbles above"),
    (16, "pinjisichen", "牝鸡司晨", "a hen standing on a rooftop crowing at dawn while a rooster watches confused below"),
    (17, "zhudouranqi", "煮豆燃萁", "a pot of beans cooking over a fire of burning bean stalks, steam rising"),
    (18, "chenyuluoyan", "沉鱼落雁", "a beautiful woman at a riverside, fish sinking below the water surface and a wild goose falling from the sky"),
    (19, "kongguzuyin", "空谷足音", "footsteps visible on a path through an empty quiet mountain valley"),
    (20, "beihuaiyuyu", "被褐怀玉", "a person wearing ragged rough clothes but with a glowing jade visible under their garment"),
    (21, "huaijinwoyu", "怀瑾握瑜", "a noble figure holding two beautiful jade stones in open palms"),
    (22, "yuxiachengqi", "余霞成绮", "a breathtaking sunset sky with layered colorful clouds resembling silk brocade"),
    (23, "yingchuangxuean", "萤窗雪案", "a student reading by the light of fireflies in a jar at night, snow reflected on the desk"),
    (24, "hongludianxue", "洪炉点雪", "a single snowflake falling into a large blazing furnace and instantly melting"),
    (25, "liufenghuixue", "流风回雪", "an ethereal flowing figure with long robes dancing in swirling wind and snow"),
    (26, "muyuzhifeng", "沐雨栉风", "a traveler walking through heavy rain and wind on a mountain path"),
    (27, "longxianghubu", "龙骧虎步", "a majestic warrior striding forward with the powerful posture of a dragon and tiger"),
    (28, "sangshuwengyou", "桑枢瓮牖", "a dilapidated small cottage with a broken earthenware jar as a window"),
    (29, "wenmengfushan", "蚊虻负山", "a tiny mosquito trying to carry an enormous mountain on its back"),
    (30, "duojingxiehua", "掇菁撷华", "hands carefully picking the most beautiful flowers from a garden"),
    (31, "kunshanpianyu", "昆山片玉", "a single glowing jade stone on a snowy mountain peak"),
    (32, "dongrixayun", "冬日夏云", "the warm winter sun and gentle summer clouds side by side in a peaceful landscape"),
    (33, "fubaizaibi", "浮白载笔", "a scholar holding a writing brush in one hand and a wine cup in the other at a desk"),
    (34, "xiayuyuren", "夏雨雨人", "gentle summer rain falling on people walking in a field, everyone looking refreshed"),
    (35, "xiaobiheqing", "笑比河清", "a stern judge-like figure with an impossibly serious unsmiling face, the Yellow River murky in background"),
    (36, "shushizhenliu", "漱石枕流", "a hermit lying by a mountain stream, using a rock as a pillow, water flowing beside"),
    (37, "lanyinxuguo", "兰因絮果", "beautiful orchid flowers on one side transforming into scattered willow catkins blowing away on the other"),
    (38, "zhiluoyanyan", "纸落云烟", "a calligrapher writing on paper, the brush strokes transforming into flowing clouds and mist"),
    (39, "suihansongbai", "岁寒松柏", "pine and cypress trees standing tall and green amid winter snow and bare trees around them"),
    (40, "gongwanluche", "共挽鹿车", "a husband and wife together pulling a small deer-drawn cart on a rural path"),
    (41, "muchengxinxu", "目成心许", "two figures in a crowd looking at each other with deep connection, eyes meeting"),
    (42, "shibufangcao", "十步芳草", "a path lined with beautiful fragrant flowers and aromatic herbs at every few steps"),
    (43, "puyuhunjin", "璞玉浑金", "an uncarved rough jade stone and an unrefined gold nugget sitting side by side"),
    (44, "feiniaoyiren", "飞鸟依人", "a small bird perched trustingly on a person's outstretched hand"),
    (45, "yizhenhuian", "一枕槐安", "a person sleeping under a large locust tree, a grand city visible in dream bubbles above"),
    (46, "gantangyiai", "甘棠遗爱", "a beautiful flourishing candy pear tree with people resting gratefully beneath its shade"),
    (47, "chunxuanbingmao", "椿萱并茂", "a tall ancient tree and blooming daylily flowers growing together in harmony"),
    (48, "mizhuxingui", "米珠薪桂", "rice grains displayed like precious pearls and firewood priced like cinnamon wood at a market stall"),
    (49, "yingzhongbaixue", "郢中白雪", "a musician playing a guqin on a snowy terrace with only a few people listening attentively below"),
    (50, "hanchanzhangma", "寒蝉仗马", "a silent cicada on a bare winter branch next to a still ceremonial horse standing motionless"),
    (51, "jushuiliuxiang", "掬水留香", "cupped hands letting water flow through fingers, fragrant flower petals drifting away"),
    (52, "yunxiamanzhi", "云霞满纸", "a desk covered with scrolls of calligraphy that seem to transform into magnificent clouds"),
    (53, "meiyiyannian", "美意延年", "a cheerful elder with a warm smile sitting peacefully in a garden with blooming flowers"),
    (54, "helinghuating", "鹤唳华亭", "a lone crane flying over an elegant pavilion calling out, a nostalgic melancholic scene"),
    (55, "wuyuanfujie", "无远弗届", "a path stretching infinitely to the horizon with mountains and rivers in the distance"),
    (56, "binghunxuepo", "冰魂雪魄", "a translucent ice crystal figure standing gracefully in a snowy landscape"),
    (57, "shanzhichuanxing", "山止川行", "a majestic mountain standing still and eternal beside a rushing river flowing endlessly"),
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def download_one(id_, pinyin, desc, retry=3):
    prompt = STYLE + desc
    encoded = urllib.parse.quote(prompt)
    seed = id_ * 7 + 13  # deterministic seed per idiom
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&seed={seed}&nologo=true&model=flux"
    filename = os.path.join(OUT_DIR, f"idiom-{id_}-{pinyin}.png")
    
    for attempt in range(retry):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            resp = urllib.request.urlopen(req, timeout=120, context=ctx)
            data = resp.read()
            if len(data) < 5000:
                print(f"    Too small ({len(data)} bytes), retrying...")
                time.sleep(3)
                continue
            with open(filename, "wb") as f:
                f.write(data)
            return True, len(data)
        except Exception as e:
            print(f"    Attempt {attempt+1} failed: {e}")
            if attempt < retry - 1:
                time.sleep(5)
    return False, 0

def main():
    total = len(IDIOMS)
    success = 0
    failed = []

    print(f"Starting batch generation: {total} idioms")
    print(f"Output dir: {OUT_DIR}")
    print("-" * 50)

    for i, (id_, pinyin, name, desc) in enumerate(IDIOMS):
        filename = os.path.join(OUT_DIR, f"idiom-{id_}-{pinyin}.png")
        if os.path.exists(filename) and os.path.getsize(filename) > 5000:
            print(f"[{i+1}/{total}] SKIP (exists): {name}")
            success += 1
            continue

        print(f"[{i+1}/{total}] Generating: {name}...", end=" ", flush=True)
        ok, size = download_one(id_, pinyin, desc)
        if ok:
            print(f"OK ({size} bytes)")
            success += 1
        else:
            print(f"FAILED")
            failed.append(name)

    print("-" * 50)
    print(f"Done: {success}/{total} succeeded.")
    if failed:
        print(f"Failed: {', '.join(failed)}")

if __name__ == "__main__":
    main()
